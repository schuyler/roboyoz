import {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";
import { Recording, Interview } from "./interview";
import { getMessage } from "./messages";
import { APIGatewayProxyResult } from "aws-lambda";

export type ActionParams = { [_: string]: string };

export type ActionResponse = {
  say: (message: string, values?: { [_: string]: string }) => void;
  gather: (
    args: GatherAttributes,
    message?: string,
    values?: ActionParams,
  ) => void;
  pause: (seconds: number) => void;
  redirect: (path: string) => void;
  record: (path: string, args?: RecordAttributes) => void;
  render: (status?: number) => APIGatewayProxyResult;
};

interface ActionContext {
  interview: Interview;
}

type Action = (
  funcs: ActionResponse,
  params: ActionParams,
  context: ActionContext,
) => Promise<void>;

const save_recording: Action = async (_, params, { interview }) => {
  if (params.RecordingStatus != "completed") {
    return;
  }
  const details: Recording = {
    recordingSid: params.recordingSid || "",
    callSid: params.CallSid || "",
    uri: params.RecordingUrl || "",
    duration: parseInt(params.RecordingDuration || "0", 10),
    topic: interview.selectedTopic,
    question: interview.answeredQuestions.slice(-1)[0] || "",
  };
  interview.recordings.push(details);
};

const answer: Action = async ({ say, redirect, pause }, _, { interview }) => {
  pause(1);
  say("greeting");
  if (!interview.answeredQuestions.length) {
    say("introduction");
  } else {
    say("welcome_back");
    // they probably didn't actually answer the last question
    interview.answeredQuestions.splice(-1);
  }
  redirect("request_subject");
};

const request_subject: Action = async ({ gather }) => {
  gather(
    {
      action: "choose_subject",
      input: ["dtmf", "speech"],
      speechModel: "phone_call",
      hints: "Schuyler, Besha",
      numDigits: 1,
      speechTimeout: "2",
      actionOnEmptyResult: true,
    },
    "request_subject",
  );
};

const choose_subject: Action = async (
  { say, redirect },
  params,
  { interview },
) => {
  const digits = params.Digits || "";
  const result = params.SpeechResult?.toLowerCase() || "";
  console.log("SpeechResult: " + result);
  let name = "";
  if (digits == "*") {
    // Oops, we want to hear the intro again.
    say("introduction");
    redirect("request_subject");
  } else if (digits == "1" || "bvptdf".includes(result[0])) {
    name = "Besha";
  } else if (digits == "2" || result[0] == "s") {
    name = "Schuyler";
  }
  if (!name) {
    say("no_idea_who");
    redirect("request_subject");
    return;
  }
  interview.selectedTopic = name;
  say("subject_chosen", { name });
  redirect("ask_question");
};

const ask_question: Action = async (
  { say, redirect, record },
  params,
  { interview },
) => {
  const topic = interview.selectedTopic;
  if (!topic) {
    throw new Error("Interview is missing a topic");
  }
  const duration = parseInt(params.RecordingDuration || "0", 10);
  if (duration > 5) {
    say("interstitial");
  } else if (duration > 0) {
    say("skip");
  }
  if (params.Digits?.includes("*")) {
    interview.answeredQuestions.splice(-2);
  }
  const question = getMessage(
    topic.toLowerCase() + "_questions",
    {},
    interview.answeredQuestions,
  );
  console.log("Asking question: " + question);
  if (!question) {
    redirect("finished");
    return;
  }
  say(question, { literal: "yes" });
  record("ask_question");
  interview.answeredQuestions.push(question);
};

const finished: Action = async ({ gather }, _, { interview }) => {
  const other = interview.selectedTopic == "Besha" ? "Schuyler" : "Besha";
  gather(
    {
      action: "goodbye",
      input: ["dtmf"],
      numDigits: 1,
      timeout: 3,
    },
    "no_more_questions",
    { other },
  );
};

const start_over: Action = async ({ redirect }, _, { interview }) => {
  // Truncate the list of questions answered, but don't ask them to re-record the intro.
  interview.answeredQuestions.length = 1;
  interview.selectedTopic = "";
  redirect("request_subject");
};

const goodbye: Action = async ({ say, redirect, pause }, params) => {
  // If they hit star to get here, they actually want to start over.
  if (params.Digits?.includes("*")) {
    redirect("start_over");
  }
  say("goodbye");
  pause(2);
};

export const actions: Record<string, Action> = {
  answer,
  save_recording,
  request_subject,
  choose_subject,
  ask_question,
  finished,
  start_over,
  goodbye,
};
