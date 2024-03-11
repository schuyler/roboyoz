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
    target: Action,
    args: GatherAttributes,
    message?: string,
    values?: ActionParams,
  ) => void;
  pause: (seconds: number) => void;
  redirect: (target: Action) => void;
  record: (target: Action, args?: RecordAttributes) => void;
  render: (status?: number) => APIGatewayProxyResult;
};

interface ActionContext {
  interview: Interview;
}

export type Action = (
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
  pause(2);
  say("greeting");
  if (!interview.answeredQuestions.length) {
    say("introduction");
    redirect(request_topic);
  } else {
    redirect(welcome_back);
  }
};

const welcome_back: Action = async ({ gather }, _, { interview }) => {
  // they probably didn't actually answer the last question
  interview.answeredQuestions.splice(-1);
  gather(
    interview.selectedTopic ? topic_chosen : request_topic,
    {
      timeout: 1,
    },
    "welcome_back",
  );
};

const request_topic: Action = async ({ gather, say }, params) => {
  const digits = params.Digits || "";
  if (digits == "*") {
    say("introduction");
  }
  gather(
    choose_topic,
    {
      input: ["dtmf", "speech"],
      speechModel: "phone_call",
      hints: "Schuyler, Besha",
      speechTimeout: "2",
    },
    "request_topic",
  );
};

const choose_topic: Action = async (
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
    redirect(interview.selectedTopic ? topic_chosen : request_topic);
    return;
  }
  if (digits == "0") {
    redirect(request_topic);
    return;
  }
  if (digits == "2" || result[0] == "s") {
    name = "Schuyler";
  } else if (digits == "1" || result) {
    name = "Besha";
  }
  if (!name) {
    say("no_idea_who");
    redirect(request_topic);
    return;
  }
  interview.selectedTopic = name;
  redirect(topic_chosen);
};

const topic_chosen: Action = async ({ gather, say }, params, { interview }) => {
  const [name, other] =
    interview.selectedTopic == "Besha"
      ? ["Besha", "Schuyler"]
      : ["Schuyler", "Besha"];
  const digits = params.Digits || "";
  if (digits == "*") {
    say("introduction");
  }
  gather(ask_question, {}, "topic_chosen", { name, other });
};

const ask_question: Action = async (
  { say, redirect, record },
  params,
  { interview },
) => {
  const digits = params.Digits || "";
  if (digits == "0") {
    redirect(request_topic);
    return;
  }
  if (digits == "*") {
    // Let's hear the intro again
    say("introduction");
  }
  const topic = interview.selectedTopic;
  if (!topic) {
    throw new Error("Interview is missing a topic");
  }
  const question = getMessage(
    topic.toLowerCase() + "_questions",
    {},
    interview.answeredQuestions,
  );
  console.log("Asking question: " + question);
  if (!question) {
    redirect(finished);
    return;
  }
  say(question, { literal: "yes" });
  record(answer_question);
  interview.answeredQuestions.push(question);
};

const answer_question: Action = async (
  { say, redirect },
  params,
  { interview },
) => {
  const digits = params.Digits || "";
  const duration = parseInt(params.RecordingDuration || "0", 10);
  if (digits == "0") {
    redirect(request_topic);
    interview.answeredQuestions.splice(-1);
    return;
  }
  if (duration > 5) {
    say("interstitial");
  } else if (duration > 0) {
    say("skip");
  }
  if (digits == "*") {
    interview.answeredQuestions.splice(-2);
  }
  redirect(ask_question);
};

const finished: Action = async ({ gather }, _, { interview }) => {
  const other = interview.selectedTopic == "Besha" ? "Schuyler" : "Besha";
  gather(
    goodbye,
    {
      action: "goodbye",
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
  redirect(request_topic);
};

const goodbye: Action = async ({ say, redirect, pause }, params) => {
  // If they hit star to get here, they actually want to start over.
  if (params.Digits?.includes("*")) {
    redirect(start_over);
  }
  say("goodbye");
  pause(2);
};

export const actions: Record<string, Action> = {
  answer,
  welcome_back,
  save_recording,
  request_topic,
  choose_topic,
  topic_chosen,
  ask_question,
  answer_question,
  finished,
  start_over,
  goodbye,
};
