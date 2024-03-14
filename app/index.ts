import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { createVoiceResponse } from "./voice";
import { ActionParams, ActionResponse, actions } from "./actions";
import { loadInterview, saveInterview } from "./interview";
import { sendErrorToSNS } from "./error";
import { getCallerName } from "./caller_id";
import { createWebResponse } from "./web";
import { saveCall, loadCall } from "./call";
import * as token from "./token";
import * as asset from "./asset";

const handler = async (
  event: APIGatewayProxyEvent,
  params: ActionParams,
  response: ActionResponse,
): Promise<APIGatewayProxyResult> => {
  try {
    // get the caller's phone number from the event parameters
    let [caller, callSid] = [params.From, params.CallSid];
    if (!caller) {
      // if the caller's phone number is not in the event parameters, try to load it from the callSid
      if (callSid) {
        const call = await loadCall(callSid);
        if (call) {
          caller = call.phoneNumber;
        }
      }
      // if the caller's phone number is still not found, throw an error
      if (!caller) {
        throw new Error("Caller could not be identified");
      }
    }
    // get the mode (i.e. voice/web) and path from the event parameters
    const [_mode, path] = event.path.split("/").filter((s) => s);
    console.log(`Call from ${caller} for ${path}`);
    // get the action from the actions object using the last element of the path
    const action = actions[path];
    if (!action) {
      throw new Error(`Action could not be identified: ${path}`);
    }
    // load the interview from the database using the caller's phone number
    const interview = await loadInterview(caller);
    // if the caller's name is not in the interview, try to get it from the caller ID
    if (!interview.callerName) {
      interview.callerName = (await getCallerName(caller)) || caller;
    }
    // call the action with the response, parameters, and interview
    await action(response, params, {
      interview,
    });
    // if the callSid isn't in the interview's calls, add it to the calls array
    if (callSid && !interview.calls.includes(callSid)) {
      interview.calls.push(callSid);
      await saveCall({ callSid, phoneNumber: caller });
    }
    await saveInterview(interview); // maybe don't want to do this every single call
    return response.render();
  } catch (error) {
    console.error("Error handling call:", error);
    sendErrorToSNS(error);
    response.say("error");
    response.pause(1);
    return response.render();
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

export const tokenHandler = token.handler,
  assetHandler = asset.handler;
