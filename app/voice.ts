import { APIGatewayProxyResult } from "aws-lambda";
import { twiml } from "twilio";
import {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";

import { ActionResponse } from "./actions";
import { voiceArgs, getMessage } from "./messages";

export const createVoiceResponse = (): ActionResponse => {
  const response = new twiml.VoiceResponse();
  const say = (message: string, values: { [key: string]: string } = {}) => {
    const text = getMessage(message, values);
    return response.say(voiceArgs, text);
  };
  const gather = (
    args: GatherAttributes,
    message: string = "",
    values: { [_: string]: string } = {},
  ) => {
    const gatherResponse = response.gather(args);
    if (message) {
      gatherResponse.say(voiceArgs, getMessage(message, values));
    }
  };
  const redirect = (path: string) => {
    response.redirect(path);
  };
  const record = (action: string, args: RecordAttributes = {}) => {
    response.record({
      action,
      timeout: 5,
      finishOnKey: "#*",
      playBeep: false,
      recordingStatusCallback: "save_recording",
      ...args,
    });
  };
  const pause = (seconds: number) => {
    response.pause({ length: seconds });
  };
  const render = (statusCode = 200): APIGatewayProxyResult => {
    return {
      statusCode: statusCode,
      body: response.toString(),
      headers: {
        "Content-Type": "application/xml",
      },
    };
  };
  return { say, gather, redirect, record, pause, render };
};
