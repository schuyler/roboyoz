import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { createVoiceResponse } from "./voice";
import { ActionParams, ActionResponses, actions } from "./actions";
import { loadInterview, saveInterview } from "./interview";
import { sendErrorToSNS } from "./error";
import { getCallerName } from "./caller";
import { createWebResponse } from "./web";

const handler = async (
  event: APIGatewayProxyEvent,
  params: ActionParams,
  response: ActionResponses,
): Promise<APIGatewayProxyResult> => {
  try {
    const caller = params.From;
    if (!caller) {
      throw new Error("Caller could not be identified");
    }
    const path = event.path.substring(1) || "answer";
    console.log(`Call from ${caller} for ${path}`);
    const action = actions[path];
    if (!action) {
      throw new Error("Action could not be identified");
    }
    const interview = await loadInterview(caller);
    if (!interview.callerName) {
      interview.callerName = (await getCallerName(caller)) || caller;
    }
    await action(response, params, {
      interview,
    });
    await saveInterview(interview); // maybe don't want to do this every single call
    return response.render();
  } catch (error) {
    console.error("Error handling call:", error);
    sendErrorToSNS(error);
    response.say("error");
    response.pause(1);
    return response.render(500);
  }
};

export const webHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const params = JSON.parse(event.body || "{}");
  const response = createWebResponse();
  return handler(event, params, response);
};

export const voiceHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const query = new URLSearchParams(event.body || "");
  const params: ActionParams = {};
  for (const [key, value] of query) {
    params[key] = value;
  }
  const response = createVoiceResponse();
  return handler(event, params, response);
};
