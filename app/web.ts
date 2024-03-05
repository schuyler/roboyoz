import { APIGatewayProxyResult } from "aws-lambda";
import { ActionResponses } from "./actions";
import { voiceArgs, getMessage } from "./messages";

// just for the argument types
import {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";

type WebResponse = {
  say: { text: string; uri?: string }[];
  gather?: GatherAttributes;
  redirect?: string;
  record?: string;
};

export const createWebResponse = (): ActionResponses => {
  const response: WebResponse = { say: [] };
  const say = (message: string, values: { [key: string]: string } = {}) => {
    const text = values["literal"] ? message : getMessage(message, values);
    response.say.push({ text });
  };
  const gather = (
    args: GatherAttributes,
    message: string = "",
    values: { [_: string]: string } = {},
  ) => {
    response.gather = args;
    if (message) {
      say(message, values);
    }
  };
  const redirect = (path: string) => {
    response.redirect = path;
  };
  const record = (action: string, args: RecordAttributes = {}) => {
    response.record = "save_recording";
    response.redirect = action;
  };
  const pause = (seconds: number) => {
    // it's a no-op
    return seconds;
  };
  const render = (statusCode = 200): APIGatewayProxyResult => {
    return {
      statusCode: statusCode,
      body: JSON.stringify(response),
      headers: {
        "Content-Type": "application/json",
      },
    };
  };
  return { say, gather, redirect, record, pause, render };
};
