import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { createVoiceResponse } from "./voice";
import { actions } from "./actions";
import { loadInterview, saveInterview } from "./interview";
import { sendErrorToSNS } from "./error";
import { getCallerName } from "./caller";

export const voiceHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const params = new URLSearchParams(event.body || "");
  const response = createVoiceResponse();

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
