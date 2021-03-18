import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as AWS from 'aws-sdk';
import { Todo } from './model/todo';

const https = require('https');

const db = new AWS.DynamoDB.DocumentClient({
  httpOptions: {
    agent: https.Agent({
      rejectUnauthorized: true,
      secureProtocol: "TLSv1_method",
      ciphers: "ALL"
    })
  },
  maxRetries: 3,
  region: process.env.AWS_REGION
});

const TABLE_NAME = process.env.TABLE_NAME || '';

const generateId = () => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < 20; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'bad_request',
        detail: 'Empty body'
      }),
      headers: {
        'content-type': 'application/json'
      }
    };
  }
  const todo = (typeof event.body == 'object' ? event.body : JSON.parse(event.body)) as Todo;

  if (!todo.title || !todo.message) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'bad_request',
        detail: 'Please provide title and message'
      }),
      headers: {
        'content-type': 'application/json'
      }
    };
  };

  // generate the id
  todo.id = generateId();

  const params = {
    TableName: TABLE_NAME,
    Item: todo
  };

  try {
    await db.put(params).promise();
    return {
      statusCode: 201,
      body: JSON.stringify(todo),
      headers: {
        'content-type': 'application/json'
      }
    };
  } catch (dbError) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'server_error',
        detail: 'An internal server error occured. Please retry'
      }),
      headers: {
        'content-type': 'application/json'
      }
    };
  }
};