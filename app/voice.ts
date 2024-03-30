import { APIGatewayProxyResult } from "aws-lambda";
import { twiml } from "twilio";
import {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";

import { Action, ActionResponse } from "./actions";
import { voiceArgs, getMessage } from "./messages";

export const createVoiceResponse = (): ActionResponse => {
  const response = new twiml.VoiceResponse();
  const say = (message: string, values: { [key: string]: string } = {}) => {
    const text = getMessage(message, values);
    return response.say(voiceArgs, text);
  };
  const gather = (
    target: Action,
    args: GatherAttributes,
    message: string = "",
    values: { [_: string]: string } = {},
  ) => {
    const gatherResponse = response.gather({
      action: target.name,
      input: ["dtmf"],
      numDigits: 1,
      actionOnEmptyResult: true,
      ...args,
    });
    if (message) {
      gatherResponse.say(voiceArgs, getMessage(message, values));
    }
  };
  const redirect = (target: Action) => {
    response.redirect(target.name);
  };
  const record = (target: Action, args: RecordAttributes = {}) => {
    response.record({
      action: target.name,
      timeout: 10,
      finishOnKey: "#*0",
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
