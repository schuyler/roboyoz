/*
A Lambda handler that returns static assets from a given AWS S3 bucket.
*/

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "@aws-sdk/client-s3";

// Lambda function to return a static asset from an S3 bucket
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const s3 = new S3();
  // Get the bucket and prefix from the environment. Throw an error if bucket is missing.
  const bucket = process.env.S3_ASSET_BUCKET;
  const prefix = process.env.S3_ASSET_PREFIX || "";
  if (!bucket) {
    throw new Error("S3_ASSET_BUCKET and S3_ASSET_PREFIX are required");
  }
  // Get the key from the remainder of the request path, but strip off the leading part that references the Lambda itself.
  // For example, if the request path is "/asset/voice.mp3", the key will be "voice.mp3".
  const key = event.pathParameters?.object;
  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "key is required" }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
  const params = {
    Bucket: bucket,
    Key: prefix + key,
  };
  const asset = await s3.getObject(params);
  if (!asset.Body || !asset.ContentType) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "asset not found" }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
  return {
    statusCode: 200,
    headers: {
      "Content-Type": asset.ContentType,
    },
    body: await asset.Body.transformToString(),
  };
};
