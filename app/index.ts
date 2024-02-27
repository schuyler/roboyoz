import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Twilio, twiml } from "twilio";
import { URLSearchParams } from "url";

import { getMessage } from "./messages";
import { SayAttributes } from "twilio/lib/twiml/VoiceResponse";

const render = (
  response: twiml.VoiceResponse,
  statusCode = 200,
): APIGatewayProxyResult => {
  return {
    statusCode: statusCode,
    body: response.toString(),
    headers: {
      "Content-Type": "application/xml",
    },
  };
};

const voiceArgs: SayAttributes = {
  voice: "Polly.Brian", // "Google.en-GB-Standard-B",
  language: "en-GB",
};

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const params = new URLSearchParams(event.body || "");
  const client = new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
  const response = new twiml.VoiceResponse();
  try {
    const caller = params.get("From");
    const callSid = params.get("CallSid");
    if (!caller) {
      throw new Error("Caller could not be identified from the request");
    }
    console.log(`Call from ${caller} for ${event.path}`);
    switch (event.path.substring(1)) {
      case "":
        if (callSid) {
          // https://www.twilio.com/docs/voice/api/recording?code-sample=code-create-recording-on-a-live-call&code-language=Node.js&code-sdk-version=4.x
          await client.calls(callSid).recordings.create({
            trim: "trim-silence",
            recordingTrack: "inbound",
          });
        }
        response.say(voiceArgs, getMessage("greeting"));
      case "request_subject":
        response.say(voiceArgs, getMessage("request_subject"));
        response.gather({
          action: "choose_subject",
          input: ["speech"],
          speechModel: "phone_call",
          hints: "Schuyler, Besha",
          speechTimeout: "2",
        });
        break;
      case "choose_subject":
        const result = params.get("SpeechResult")?.toLowerCase() || "";
        console.log("SpeechResult: " + result);
        let name = "";
        if (result[0] == "b") {
          name = "Besha";
        } else if (result[0] == "s") {
          name = "Schuyler";
        }
        if (!name) {
          response.say("no_idea_who");
          response.redirect("request_subject");
          break;
        }
        response.say(voiceArgs, getMessage("subject_chosen", { name }));
        response.gather({
          action: "goodbye",
          input: ["dtmf"],
          timeout: 120,
          finishOnKey: "#",
        });
        break;
      case "goodbye":
        response.say(voiceArgs, getMessage("goodbye"));
        response.hangup();
        break;
    }
    // response.say(`I see you are calling from ${caller}`);
    return render(response);
  } catch (error) {
    console.error("Error handling call:", error);
    response.say("An error occurred. Please try again later.");
    return render(response, 500);
  }
};
