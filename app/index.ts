import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { createVoiceResponse } from "./voice";
import { ActionParams, ActionResponses, actions } from "./actions";
import { loadInterview, saveInterview } from "./interview";
import { sendErrorToSNS } from "./error";
import { getCallerName } from "./caller";
import { createWebResponse } from "./web";

// Provide a function that extracts a URLSearchParams object into a regular TypeScript object
function extractParams(params: URLSearchParams): ActionParams {
  const result: ActionParams = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  let params: ActionParams, response: ActionResponses;
  const isCall = !event.headers["Content-Type"]?.startsWith("application/json");
  if (isCall) {
    params = extractParams(new URLSearchParams(event.body || ""));
    response = createVoiceResponse();
  } else {
    params = JSON.parse(event.body || "{}");
    response = createWebResponse();
  }
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
