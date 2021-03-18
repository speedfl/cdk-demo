import * as AWS from 'aws-sdk';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const db = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || '';

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

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'not_found',
          detail: `No todo found for id "${id}"`,
        }),
        headers: {
          'content-type': 'application/json'
        }
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response.Item),
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