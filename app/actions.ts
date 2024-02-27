import { Twilio, twiml } from "twilio";
import {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";
import { Interview } from "./interview";
import { getMessage } from "./messages";

interface ActionResponses {
  say: (message: string, values?: { [key: string]: string }) => void;
  gather: (args: GatherAttributes) => void;
  redirect: (path: string) => void;
  record: (path: string, args?: RecordAttributes) => void;
  response: twiml.VoiceResponse;
}

interface ActionContext {
  interview: Interview;
}

type Action = (
  funcs: ActionResponses,
  params: URLSearchParams,
  context: ActionContext,
) => Promise<void>;

const answer = async (
  { say, redirect, response }: ActionResponses,
  _params: URLSearchParams,
  { interview }: ActionContext,
) => {
  response.pause({ length: 1 });
  say("greeting");
  if (!interview.selectedTopic) {
    say("introduction");
  } else {
    say("welcome_back");
  }
  interview.introduced = true;
  redirect("request_subject");
};

// this is actually not used
const record_call = async (
  { redirect }: ActionResponses,
  params: URLSearchParams,
) => {
  const client = new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
  const callSid = params.get("CallSid");

  if (callSid) {
    // https://www.twilio.com/docs/voice/api/recording?code-sample=code-create-recording-on-a-live-call&code-language=Node.js&code-sdk-version=4.x
    await client.calls(callSid).recordings.create({
      trim: "trim-silence",
      recordingTrack: "inbound",
    });
  }
  redirect("request_subject");
};

const request_subject = async (
  { say, gather }: ActionResponses,
  _params: URLSearchParams,
) => {
  say("request_subject");
  gather({
    action: "choose_subject",
    input: ["dtmf", "speech"],
    speechModel: "phone_call",
    hints: "Schuyler, Besha",
    numDigits: 1,
    speechTimeout: "2",
  });
};

const choose_subject = async (
  { say, redirect, record }: ActionResponses,
  params: URLSearchParams,
  { interview }: ActionContext,
) => {
  const digits = params.get("Digits") || "";
  const result = params.get("SpeechResult")?.toLowerCase() || "";
  console.log("SpeechResult: " + result);
  let name = "";
  if (digits == "1" || "bvptdf".includes(result[0])) {
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

const ask_question = async (
  { say, redirect, record }: ActionResponses,
  params: URLSearchParams,
  { interview }: ActionContext,
) => {
  const topic = interview.selectedTopic;
  if (!topic) {
    throw new Error("Interview is missing a topic");
  }
  if (params.get("Digits")?.includes("*")) {
    interview.answeredQuestions.splice(-2);
  } else if (interview.introduced) {
    interview.introduced = false;
  } else {
    say("interstitial");
  }
  const question = getMessage(
    topic.toLowerCase() + "_questions",
    {},
    interview.answeredQuestions,
  );
  if (!question) {
    redirect("goodbye");
  }
  say(question, { literal: "yes" });
  record("ask_question");
  interview.answeredQuestions.push(question);
};

const goodbye = async (
  { say, response }: ActionResponses,
  _params: URLSearchParams,
) => {
  say("goodbye");
  response.pause({ length: 2 });
};

const hangup = async ({ response }: ActionResponses) => {
  response.hangup();
};

export const actions: Record<string, Action> = {
  answer,
  record_call,
  request_subject,
  choose_subject,
  ask_question,
  goodbye,
  hangup,
};
