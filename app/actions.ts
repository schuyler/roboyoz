import { Twilio, twiml } from "twilio";
import {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";
import { Interview } from "./interview";

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
  { say, redirect }: ActionResponses,
  _params: URLSearchParams,
) => {
  say("greeting");
  redirect("record_call");
};

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
    input: ["speech"],
    speechModel: "phone_call",
    hints: "Schuyler, Besha",
    speechTimeout: "2",
  });
};

const choose_subject = async (
  { say, redirect, record }: ActionResponses,
  params: URLSearchParams,
  { interview }: ActionContext,
) => {
  const result = params.get("SpeechResult")?.toLowerCase() || "";
  console.log("SpeechResult: " + result);
  let name = "";
  if ("bvptdf".includes(result[0])) {
    name = "Besha";
  } else if (result[0] == "s") {
    name = "Schuyler";
  }
  if (!name) {
    say("no_idea_who");
    redirect("request_subject");
    return;
  }
  interview.selectedTopic = name;
  say("subject_chosen", { name });
  record("ask_question");
};

const ask_question = async (
  { say, redirect, record }: ActionResponses,
  params: URLSearchParams,
  { interview }: ActionContext,
) => {
  if (params.get("Digits")?.includes("*")) {
    redirect("goodbye");
  }
  const topic = interview.selectedTopic;
  if (!topic) {
    throw new Error("Interview is missing a topic");
  }
  say("interstitial");
  say(topic.toLowerCase() + "_questions");
  record("ask_question");
  /*
  gather({
    action: "ask_question",
    input: ["dtmf"],
    timeout: 3600,
    actionOnEmptyResult: true,
    numDigits: 1,
  });*/
};

const goodbye = async (
  { say, response }: ActionResponses,
  _params: URLSearchParams,
) => {
  say("goodbye");
  response.pause({ length: 3 });
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
