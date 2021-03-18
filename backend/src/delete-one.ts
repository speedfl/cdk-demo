import * as AWS from 'aws-sdk';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const db = new AWS.DynamoDB.DocumentClient();

const sns = new AWS.SNS({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME || '';
const REPORT_TOPIC_ARN = process.env.REPORT_TOPIC_ARN || '';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {

    const id = event.pathParameters?.id;

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'bad_request',
                detail: 'No todo id'
            }),
            headers: {
              'content-type': 'application/json'
            }
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Key: {
            id
        }
    };

    try {
        const response = await db.get(params).promise();

        // directly return item
        if (!response.Item) {
            return {
                statusCode: 204,
                body: '',
                headers: {
                  'content-type': 'application/json'
                }
            };
        }

        await db.delete(params).promise();

        await sendNotification(response.Item.title)

        return {
            statusCode: 204,
            body: '',
            headers: {
              'content-type': 'application/json'
            }
        };
    } catch (dbError) {
        return {
            statusCode: 500,
            body: JSON.stringify(dbError),
            headers: {
              'content-type': 'application/json'
            }
        };
    }
};

const sendNotification = async (title: string): Promise<void> => {
    return new Promise<void>((resolve) => {
        sns.publish({ 
            TopicArn: REPORT_TOPIC_ARN, 
            Subject: 'Todo Deleted',
            Message: `Todo with title "${title}" has been deleted` 
        }, (error, response) => {
            if(error) {
                console.error('Error caught during notification', error);
            }
            if(response) {
                console.log(`Notification sent. MessageId = ${response.MessageId}, SequenceNumber = ${response.SequenceNumber}`);
            }
            resolve();
        });
    })
    
}