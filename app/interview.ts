// Initialize DynamoDB DocumentClient
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

export const tableName = "RoboYoz_Interviews";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export type Recording = {
  callSid: string;
  recordingSid: string;
  uri: string;
  duration: number;
  topic: string;
  question: string;
};

export type Interview = {
  callerName: string;
  phoneNumber: string;
  introduced: boolean;
  selectedTopic: string;
  answeredQuestions: string[];
  calls: string[];
  recordings: Recording[];
};

// Function to retrieve or initialize Interview object
export async function loadInterview(phoneNumber: string): Promise<Interview> {
  try {
    // Define parameters for DocumentClient get operation
    const params = new GetCommand({
      TableName: tableName,
      Key: {
        phoneNumber: phoneNumber,
      },
    });

    // Call DocumentClient get operation
    const data = await docClient.send(params);

    // If no data found, return initialized Interview object
    if (!data.Item) {
      return {
        callerName: "",
        phoneNumber: phoneNumber,
        introduced: false,
        selectedTopic: "",
        answeredQuestions: [],
        calls: [],
        recordings: [],
      };
    }

    // Parse retrieved data into Interview object
    return {
      ...data.Item,
      recordings: JSON.parse(data.Item.recordings),
    } as Interview;
  } catch (error: any) {
    // Throw exception if error occurs
    throw new Error(
      `Error fetching interview data: ${(error as Error).message}`,
    );
  }
}

// Function to save Interview object to DynamoDB
export async function saveInterview(interview: Interview): Promise<void> {
  try {
    // Define parameters for DocumentClient put operation
    const params = new PutCommand({
      TableName: tableName,
      Item: { ...interview, recordings: JSON.stringify(interview.recordings) },
    });

    // Call DocumentClient put operation
    await docClient.send(params);
  } catch (error: any) {
    // Throw exception if error occurs
    throw new Error(`Error saving interview data: ${(error as Error).message}`);
  }
}

// Function to return a list of all caller phone numbers
export async function listCallerPhoneNumbers(): Promise<string[]> {
  try {
    const params = new ScanCommand({
      TableName: tableName,
      ProjectionExpression: "phoneNumber",
    });
    const data = await docClient.send(params);
    return data.Items?.map((item) => item.phoneNumber) ?? [];
  } catch (error: any) {
    throw new Error(
      `Error listing caller phone numbers: ${(error as Error).message}`,
    );
  }
}
