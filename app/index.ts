import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { createVoiceResponse } from "./voice";
import { ActionParams, ActionResponse, actions } from "./actions";
import { loadInterview, saveInterview } from "./interview";
import { sendErrorToSNS } from "./error";
import { getCallerName } from "./caller";
import { createWebResponse } from "./web";

const handler = async (
  event: APIGatewayProxyEvent,
  params: ActionParams,
  response: ActionResponse,
): Promise<APIGatewayProxyResult> => {
  try {
    const caller = params.From;
    if (!caller) {
      throw new Error("Caller could not be identified");
    }
    const [_mode, path] = event.path.split("/").filter((s) => s);
    console.log(`Call from ${caller} for ${path}`);
    // get the action from the actions object using the last element of the path
    const action = actions[path];
    if (!action) {
      throw new Error(`Action could not be identified: ${path}`);
    }
    // load the interview from the database using the caller's phone number
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
