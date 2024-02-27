import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { twiml } from "twilio";
import { GatherAttributes } from "twilio/lib/twiml/VoiceResponse";
import { URLSearchParams } from "url";

import { actions } from "./actions";
import { getMessage } from "./messages";

const render = (
  response: twiml.VoiceResponse,
  statusCode = 200,
): APIGatewayProxyResult => {
  return {
    statusCode: statusCode,
    body: response.toString(),
    headers: {
      "Content-Type": "application/xml",
    },
  };
};

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const params = new URLSearchParams(event.body || "");
  const response = new twiml.VoiceResponse();
  const say = (message: string, values?: { [key: string]: string }) => {
    const text = getMessage(message, values);
    response.say(
      {
        voice: "Google.en-GB-Standard-B",
        language: "en-GB",
      },
      text,
    );
  };
  const gather = (args: GatherAttributes) => {
    response.gather(args);
  };
  const redirect = (path: string) => {
    response.redirect(path);
  };

  try {
    const caller = params.get("From");
    if (!caller) {
      throw new Error("Caller could not be identified");
    }
    const path = event.path.substring(1) || "answer";
    console.log(`Call from ${caller} for ${path}`);
    const action = actions[path];
    if (!action) {
      throw new Error("Action could not be identified");
    }
    await action({ say, gather, redirect, response }, params);
    return render(response);
  } catch (error) {
    console.error("Error handling call:", error);
    say("An error occurred. Please try again later.");
    return render(response, 500);
  }
};
