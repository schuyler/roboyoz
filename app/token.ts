/*
Generate a new Twilio voice audio access token
*/

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import AccessToken from "twilio/lib/jwt/AccessToken";

type TokenConfig = {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_API_KEY: string;
  TWILIO_API_SECRET: string;
  TWILIO_APP_SID: string;
};

// Generate a new Twilio voice audio access token, given an identity
export const generateToken = (identity: string, env: TokenConfig): string => {
  const token = new AccessToken(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_API_KEY,
    env.TWILIO_API_SECRET,
    { identity },
  );
  const grant = new AccessToken.VoiceGrant({
    outgoingApplicationSid: env.TWILIO_APP_SID,
  });
  token.addGrant(grant);
  return token.toJwt();
};

// Lambda function to generate a new Twilio voice audio access token
// The identity is passed as a query parameter but not validated
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const identity = event.queryStringParameters?.identity;
  if (!identity) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "identity is required" }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
  const token = generateToken(identity, process.env as TokenConfig);
  return {
    statusCode: 200,
    body: JSON.stringify({ token }),
    headers: {
      "Content-Type": "application/json",
    },
  };
};
