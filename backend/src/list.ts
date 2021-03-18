import * as AWS from 'aws-sdk';
import { APIGatewayProxyResultV2 } from "aws-lambda";

const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (): Promise<APIGatewayProxyResultV2> => {

  const params = {
    TableName: TABLE_NAME
  };

  try {
    const response = await db.scan(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(response.Items),
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