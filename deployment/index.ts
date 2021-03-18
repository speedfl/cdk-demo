import * as cdk from '@aws-cdk/core';
import regions = require('./config/regions.json');
import { ApplicationStack } from './stacks/application-stack';

const app = new cdk.App();

regions.forEach((localRegion) => {
    const region = localRegion;
    if (!region.id || !region.awsRegion) {
        const error = 'Region is not configured correctly. Please specify a region id and the corresponding aws region in config/regions.json';
        throw new Error(error);
    }

    new ApplicationStack(app, region);
    
});

app.synth();
