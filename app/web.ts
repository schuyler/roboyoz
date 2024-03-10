import { APIGatewayProxyResult } from "aws-lambda";
import { Action, ActionResponse } from "./actions";
import { getMessage } from "./messages";

// just for the argument types
import {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";

type WebResponse = {
  say: { text: string; uri?: string }[];
  gather?: GatherAttributes;
  redirect?: string;
  record?: Record<string, any>;
};

export const createWebResponse = (): ActionResponse => {
  const response: WebResponse = { say: [] };
  const say = (message: string, values: { [key: string]: string } = {}) => {
    const text = values["literal"] ? message : getMessage(message, values);
    response.say.push({ text });
  };
  const gather = (
    target: Action,
    args: GatherAttributes,
    message: string = "",
    values: { [_: string]: string } = {},
  ) => {
    response.gather = { action: target.name, ...args };
    if (message) {
      say(message, values);
    }
  };
  const redirect = (target: Action) => {
    response.redirect = target.name;
  };
  const record = (target: Action, args: RecordAttributes = {}) => {
    response.record = { action: target.name, ...args };
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
