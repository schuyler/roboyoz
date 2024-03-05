// Initialize DynamoDB DocumentClient
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

export const tableName = "RoboYoz_Interviews";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export type Interview = {
  callerName: string;
  phoneNumber: string;
  introduced: boolean;
  selectedTopic: string;
  answeredQuestions: string[];
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
      };
    }

    // Parse retrieved data into Interview object
    return data.Item as Interview;
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
      Item: interview,
    });

    // Call DocumentClient put operation
    await docClient.send(params);
    console.log("Interview record saved successfully.");
  } catch (error: any) {
    // Throw exception if error occurs
    throw new Error(`Error saving interview data: ${(error as Error).message}`);
  }
}
