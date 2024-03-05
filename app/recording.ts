// DynamoDB model to store Twilio recording data
// New records will be created by the parameters sent by the TwiML <Record> verb.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

export const tableName = "RoboYoz_Recordings";

// Subset of the Twilio recording type
export type Recording = {
  callSid: string;
  recordingSid: string;
  uri: string;
  duration: number;
  phoneNumber: string;
  topic: string;
  question: string;
};

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Function to save a Recording object to DynamoDB
export async function saveRecording(recording: Recording): Promise<void> {
  // Define parameters for DocumentClient put operation
  const params = new PutCommand({
    TableName: tableName,
    Item: recording,
  });

  try {
    await docClient.send(params);
  } catch (error: any) {
    // Throw exception if error occurs
    throw new Error(`Error saving recording data: ${(error as Error).message}`);
  }
}

// Function to get a recording from DynamoDB using the recordingSid
export async function loadRecording(
  recordingSid: string,
): Promise<Recording | undefined> {
  // Define parameters for DocumentClient get operation
  const params = new GetCommand({
    TableName: tableName,
    Key: {
      recordingSid: recordingSid,
    },
  });
  try {
    // Call DocumentClient get operation
    const data = await docClient.send(params);
    // Parse retrieved data into Recording object
    return data.Item as Recording; // what happens if data is empty
  } catch (error: any) {
    // Throw exception if error occurs
    throw new Error(`Error saving recording data: ${(error as Error).message}`);
  }
}
