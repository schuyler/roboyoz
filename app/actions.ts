import { GatherAttributes } from "twilio/lib/twiml/VoiceResponse";
import { Twilio, twiml } from "twilio";

interface ResponseFunctions {
  say: (message: string, values?: { [key: string]: string }) => void;
  gather: (args: GatherAttributes) => void;
  redirect: (path: string) => void;
  response: twiml.VoiceResponse;
}

type ActionFunction = (
  funcs: ResponseFunctions,
  params: URLSearchParams,
) => Promise<void>;

const answer = async (
  { redirect }: ResponseFunctions,
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
  redirect("greeting");
};

const greeting = async (
  { say, redirect }: ResponseFunctions,
  _params: URLSearchParams,
) => {
  say("greeting");
  redirect("request_subject");
};

const request_subject = async (
  { say, gather }: ResponseFunctions,
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
  { say, redirect, gather }: ResponseFunctions,
  params: URLSearchParams,
) => {
  const result = params.get("SpeechResult")?.toLowerCase() || "";
  console.log("SpeechResult: " + result);
  let name = "";
  if (result[0] == "b") {
    name = "Besha";
  } else if (result[0] == "s") {
    name = "Schuyler";
  }
  if (!name) {
    say("no_idea_who");
    redirect("request_subject");
    return;
  }
  say("subject_chosen", { name });
  gather({
    action: "goodbye",
    input: ["dtmf"],
    timeout: 120,
    finishOnKey: "#",
  });
};

const goodbye = async (
  { say, response }: ResponseFunctions,
  _params: URLSearchParams,
) => {
  say("goodbye");
  response.pause({ length: 3 });
};

const hangup = async ({ response }: ResponseFunctions) => {
  response.hangup();
};

export const actions: Record<string, ActionFunction> = {
  answer,
  greeting,
  request_subject,
  choose_subject,
  goodbye,
  hangup,
};
