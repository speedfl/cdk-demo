import * as apigateway from '@aws-cdk/aws-apigatewayv2';
import * as apigatewayIntegration from '@aws-cdk/aws-apigatewayv2-integrations';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as awslog from '@aws-cdk/aws-logs';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53Target from '@aws-cdk/aws-route53-targets';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubscription from '@aws-cdk/aws-sns-subscriptions';
import * as cdk from '@aws-cdk/core';
import * as global from '../config/global.json';
import { Region } from '../model/region';

/**
 * Configures the Application stack
 */
export class ApplicationStack extends cdk.Stack {

    constructor(application: cdk.App, region: Region) {
        const props = { env: { account: global.accountId, region: region.awsRegion } };
        const id = `${global.appName}-${region.id}`;
        super(application, id, props);

        if (!props.env) {
            throw new Error('Env must be specified');
        }

        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: global.domainHostedZoneId,
            zoneName: global.domainHostedZoneName,
        });

        this.createFrontend(region, hostedZone);
        this.createBackend(region, hostedZone);

        // Add tags to all elements
        cdk.Tags.of(this).add('project', id);
    }

    /*******************************************************************************************
     * 
     * 
     * FRONTEND
     * 
     * 
     *******************************************************************************************/

    /**
     * Create the frontend
     * @param region: The region on which to deploy
     * @param hostedZone: The route53 hostedZone
     */
    createFrontend(region: Region, hostedZone: route53.IHostedZone) {
        const bucket = this.createBucket(region);
        this.createCloudFrontDistribution(region, hostedZone, bucket);
    }

    /**
     * Create Cloudformation webdistribution
     * @param region: The region on which to deploy
     * @param hostedZone: The route53 hostedZone
     * @param bucket: the target bucket
     */
    createCloudFrontDistribution(region: Region, hostedZone: route53.IHostedZone, bucket: s3.IBucket) {

        // creates the OAI so that only cloudfront can access the S3 bucket
        const oai = new cloudfront.OriginAccessIdentity(this, `OAI`);

        bucket.grantRead(oai);

        // create the frontend certificate
        // for cloudfront needs to create certificate in us-east-1
        const certificate = new acm.DnsValidatedCertificate(this, `FrontendCertificate`, {
            domainName: region.domain,
            region: 'us-east-1',
            hostedZone: hostedZone,
            validation: acm.CertificateValidation.fromDns(hostedZone),
            subjectAlternativeNames: [`www.${region.domain}`],
        });

        const distribution = new cloudfront.CloudFrontWebDistribution(this, `Distribution`, {
            originConfigs: [
                {
                    behaviors: [{ isDefaultBehavior: true }],
                    s3OriginSource: {
                        s3BucketSource: bucket,
                        originAccessIdentity: oai,
                    },
                }
            ],
            // this add the redirect rule ton index.html in case the 403 or 404 are caught
            errorConfigurations: [
                {
                    errorCode: 403,
                    responseCode: 200,
                    responsePagePath: '/index.html',
                },
                {
                    errorCode: 404,
                    responseCode: 200,
                    responsePagePath: '/index.html'
                }
            ],
            viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
                certificate,
                {
                    aliases: [region.domain, `www.${region.domain}`],
                    securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1,
                    sslMethod: cloudfront.SSLMethod.SNI
                }),
            geoRestriction: {
                locations: region.geoRestrictions,
                restrictionType: 'whitelist',
            }
        });

        // create two A records one for wwww.domain and one for domain
        new route53.ARecord(this, `wwwAlias`, {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new route53Target.CloudFrontTarget(distribution)),
            recordName: `www.${region.domain}`,
        });

        new route53.ARecord(this, `RootAlias`, {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new route53Target.CloudFrontTarget(distribution)),
            recordName: `${region.domain}`,
        });

        // Ouput backend host url
        new cdk.CfnOutput(this, 'SiteUrl', {
            value: `https://${region.domain}`,
            description: `The website url. You can access your website  https://${region.domain}`
        });

        // Ouput backend host url
        new cdk.CfnOutput(this, 'WWWSiteURL', {
            value: `https://www.${region.domain}`,
            description: `The www website url. You can access your website  https://www.${region.domain}`
        });
    }

    /**
     * Create bucket
     *
     * @param region: the region on which to deploy
     */
    createBucket(region: Region): s3.IBucket {

        const bucket = new s3.Bucket(this, `websiteBucket`, {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            websiteIndexDocument: 'index.html',
            bucketName: `${global.appName}-website-${region.id}`,
            encryption: s3.BucketEncryption.KMS_MANAGED,
        });

        // add bucket deployment
        new s3Deployment.BucketDeployment(this, `websiteBucketDeployment`, {
            // target from built directory
            sources: [s3Deployment.Source.asset('bundle/frontend')],
            destinationBucket: bucket
        });

        return bucket;
    }

    /*******************************************************************************************
     * 
     * 
     * BACKEND
     * 
     * 
     *******************************************************************************************/

    /**
     * Launch backend creation
     * @param region 
     * @param hostedZone 
     */
    createBackend(region: Region, hostedZone: route53.IHostedZone) {

        const dynamoDB = this.createDynamoDB();
        const snsTopic = this.createReportSNSTopic(region);

        const optionsFunction = new lambda.Function(this, 'optionsFunction', {
            code: new lambda.AssetCode('bundle/backend'),
            functionName: `${global.appName}-${region.id}-options-http`,
            handler: 'options.handler',
            runtime: lambda.Runtime.NODEJS_14_X
        });

        const createOneFunction = new lambda.Function(this, 'createOneFunction', {
            code: new lambda.AssetCode('bundle/backend'),
            functionName: `${global.appName}-${region.id}-create`,
            handler: 'create.handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            environment: {
                TABLE_NAME: dynamoDB.tableName,
            },
            memorySize: 512
        });

        const listFunction = new lambda.Function(this, 'listFunction', {
            code: new lambda.AssetCode('bundle/backend'),
            functionName: `${global.appName}-${region.id}-list`,
            handler: 'list.handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            environment: {
                TABLE_NAME: dynamoDB.tableName,
            },
            memorySize: 256
        });

        const getOneFunction = new lambda.Function(this, 'getOneFunction', {
            code: new lambda.AssetCode('bundle/backend'),
            functionName: `${global.appName}-${region.id}-get-one`,
            handler: 'get-one.handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            environment: {
                TABLE_NAME: dynamoDB.tableName,
            },
            memorySize: 256
        });

        const deleteOneFunction = new lambda.Function(this, 'deleteOneFunction', {
            code: new lambda.AssetCode('bundle/backend'),
            functionName: `${global.appName}-${region.id}-delete-one`,
            handler: 'delete-one.handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            environment: {
                TABLE_NAME: dynamoDB.tableName,
                REPORT_TOPIC_ARN: snsTopic.topicArn,
            },
            memorySize: 256
        });

        // read write for create and delete functions
        dynamoDB.grantReadWriteData(createOneFunction);
        dynamoDB.grantReadWriteData(deleteOneFunction);

        // read for getOne and list
        dynamoDB.grantReadData(getOneFunction);
        dynamoDB.grantReadData(listFunction);

        // allow delete function to publish
        snsTopic.grantPublish(deleteOneFunction);

        const certificate = new acm.DnsValidatedCertificate(this, `BackendCertificate`, {
            domainName: `api.${region.domain}`,
            region: region.awsRegion,
            hostedZone: hostedZone,
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });

        const domainName = new apigateway.DomainName(this, 'DN', {
            domainName: `api.${region.domain}`,
            certificate,
        });

        const todoAPI = new apigateway.HttpApi(this, 'todoApi', {
            defaultDomainMapping: {
                domainName,
            },
            apiName: 'Todo',
            description: 'The todo API',
            corsPreflight: {
                allowMethods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST, apigateway.HttpMethod.DELETE],
                allowCredentials: true,
                maxAge: cdk.Duration.hours(1),
                allowHeaders: ['authorization', 'content-type', 'accept', 'referer', 'user-agent'],
                allowOrigins: [`https://www.${region.domain}`, `https://${region.domain}`],
            },
            // Disable for production
            disableExecuteApiEndpoint: true,
        });

        // add metrics
        todoAPI.metricClientError();

        // add logs
        const log = new awslog.LogGroup(this, 'log')
        const stage = todoAPI.defaultStage?.node.defaultChild as apigateway.CfnStage;
        stage.accessLogSettings = {
            destinationArn: log.logGroupArn,
            format: `$context.identity.sourceIp - - [$context.requestTime] "$context.httpMethod $context.routeKey $context.protocol" $context.status $context.responseLength $context.requestId`,
        }

        // Add routes POST / GET / DELETE
        todoAPI.addRoutes({
            path: '/todo',
            methods: [
                apigateway.HttpMethod.OPTIONS,
            ],
            integration: new apigatewayIntegration.LambdaProxyIntegration({ handler: optionsFunction }),
        });

        todoAPI.addRoutes({
            path: '/todo',
            methods: [
                apigateway.HttpMethod.GET,
            ],
            integration: new apigatewayIntegration.LambdaProxyIntegration({ handler: listFunction }),
        });

        todoAPI.addRoutes({
            path: '/todo',
            methods: [
                apigateway.HttpMethod.POST,
            ],
            integration: new apigatewayIntegration.LambdaProxyIntegration({ handler: createOneFunction }),
        });

        todoAPI.addRoutes({
            path: '/todo/{id}',
            methods: [
                apigateway.HttpMethod.GET,
            ],
            integration: new apigatewayIntegration.LambdaProxyIntegration({ handler: getOneFunction }),
        });

        todoAPI.addRoutes({
            path: '/todo/{id}',
            methods: [
                apigateway.HttpMethod.DELETE
            ],
            integration: new apigatewayIntegration.LambdaProxyIntegration({ handler: deleteOneFunction }),
        });

        new route53.ARecord(this, `AliasApi`, {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new route53Target.ApiGatewayv2Domain(domainName)),
            recordName: `api.${region.domain}`,
        });

        // Ouput backend host url
        new cdk.CfnOutput(this, 'APIUrl', {
            value: `https://api.${region.domain}`,
            description: `The API url. You can shoot your API using https://api.${region.domain}`
        });
    }

    /**
    * Creates the dynamoDB table
    */
    createDynamoDB() {
        return new dynamodb.Table(this, 'TodoList', {
            tableName: 'TodoList',
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });
    }

    /**
     * Creates the SNS topic for report
     * 
     * @param region 
     */
    createReportSNSTopic(region: Region) {
        const myTopic = new sns.Topic(this, 'ReportTopic',
            {
                topicName: `${global.appName}-report-${region.id}`,
            });
        myTopic.addSubscription(new snsSubscription.EmailSubscription(`${global.email}`));
        return myTopic;
    }
}