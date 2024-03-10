// DynamoDB model to store Twilio call data
//
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

export const tableName = "RoboYoz_Calls";

// Subset of the Twilio recording type
export type Call = {
  callSid: string;
  phoneNumber: string;
};

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Function to save a Recording object to DynamoDB
export async function saveCall(call: Call): Promise<void> {
  // Define parameters for DocumentClient put operation
  const params = new PutCommand({
    TableName: tableName,
    Item: call,
  });

  try {
    await docClient.send(params);
  } catch (error: any) {
    // Throw exception if error occurs
    throw new Error(`Error saving call: ${(error as Error).message}`);
  }
}

// Function to get a recording from DynamoDB using the recordingSid
export async function loadCall(callSid: string): Promise<Call | undefined> {
  // Define parameters for DocumentClient get operation
  const params = new GetCommand({
    TableName: tableName,
    Key: { callSid },
  });
  try {
    // Call DocumentClient get operation
    const data = await docClient.send(params);
    // Parse retrieved data into Recording object
    return data.Item as Call; // what happens if data is empty
  } catch (error: any) {
    // Throw exception if error occurs
    throw new Error(`Error loading call: ${(error as Error).message}`);
  }
}
