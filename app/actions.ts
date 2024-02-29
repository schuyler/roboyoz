import { Twilio, twiml } from "twilio";
import VoiceResponse, {
  GatherAttributes,
  RecordAttributes,
} from "twilio/lib/twiml/VoiceResponse";
import { Interview } from "./interview";
import { Recording, saveRecording } from "./recording";
import { getMessage } from "./messages";

interface ActionResponses {
  say: (message: string, values?: { [_: string]: string }) => VoiceResponse.Say;
  gather: (
    args: GatherAttributes,
    message?: string,
    values?: { [_: string]: string },
  ) => VoiceResponse.Gather;
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

const save_recording = async (
  _: ActionResponses,
  params: URLSearchParams,
  { interview }: ActionContext,
) => {
  if (params.get("RecordingStatus") != "completed") {
    return;
  }
  const recordingSid = params.get("RecordingSid");
  if (!recordingSid) {
    throw new Error("RecordingSid is required");
  }
  const details: Recording = {
    recordingSid: recordingSid,
    callSid: params.get("CallSid") || "",
    uri: params.get("RecordingUrl") || "",
    duration: parseInt(params.get("RecordingDuration") || "0", 10),
    phoneNumber: interview.phoneNumber,
    topic: interview.selectedTopic,
    question: interview.answeredQuestions.slice(-1)[0] || "",
  };
  saveRecording(details);
};

const answer = async (
  { say, redirect, response }: ActionResponses,
  _params: URLSearchParams,
  { interview }: ActionContext,
) => {
  response.pause({ length: 1 });
  say("greeting");
  if (!interview.answeredQuestions.length) {
    say("introduction");
  } else {
    say("welcome_back");
  }
  interview.introduced = true;
  redirect("request_subject");
};

const request_subject = async (
  { gather }: ActionResponses,
  _params: URLSearchParams,
) => {
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

const choose_subject = async (
  { say, redirect }: ActionResponses,
  params: URLSearchParams,
  { interview }: ActionContext,
) => {
  const digits = params.get("Digits") || "";
  const result = params.get("SpeechResult")?.toLowerCase() || "";
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
    redirect("finished");
  }
  say(question, { literal: "yes" });
  record("ask_question");
  interview.answeredQuestions.push(question);
};

const finished = async (
  { gather }: ActionResponses,
  _: URLSearchParams,
  { interview }: ActionContext,
) => {
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

const start_over = async (
  { redirect }: ActionResponses,
  _params: URLSearchParams,
  { interview }: ActionContext,
) => {
  // Truncate the list of questions answered, but don't ask them to re-record the intro.
  interview.answeredQuestions.length = 1;
  interview.selectedTopic = "";
  interview.introduced = true;
  redirect("request_subject");
};

const goodbye = async (
  { say, redirect, response }: ActionResponses,
  params: URLSearchParams,
) => {
  // If they hit star to get here, they actually want to start over.
  if (params.get("Digits")?.includes("*")) {
    redirect("start_over");
  }
  say("goodbye");
  response.pause({ length: 2 });
  // Explicit hangup might not be needed
  // response.hangup();
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
