import { SayAttributes } from "twilio/lib/twiml/VoiceResponse";

const messages: Record<string, string | string[]> = {
  greeting:
    "Hello, and welcome to the Erle-Grey Wedding Interview Hotline. I'm your host, Robo-Yoz.",
  introduction:
    "I'd love to ask you a few questions for a one-off audio production about the wedding of Besha and Schuyler. " +
    "Your responses may be shared with the other wedding guests in whole, in part, or not at all, depending on how funny you are. " +
    "Please feel free to skip any questions you don't feel like answering. " +
    "You can call back at any time and pick up where you left off.",
  welcome_back:
    "I see you've called before. Welcome back. If you want to hear the intro again, press star now.",
  request_topic:
    "Who would you like to be interviewed about? For Besha, press 1. For Schuyler, press 2.",
  no_idea_who: "Sorry, I have no idea who that is. Let's try again.",
  topic_chosen:
    "Let's chat about ${name}. At any time, you can press zero to talk about ${other} instead. " +
    "Whenever you're ready to move on to the next question, press pound. To go back to the previous question, press star.",
  besha_questions: [
    "First off, would you please introduce yourself to our listeners, and say a few words about who you are?",
    "How do you know Besha?",
    "Tell us your favorite story about Besha. It could be something funny, heartwarming, or, ideally, a little embarrassing.",
    "What's Besha's favorite color?",
    "How do Besha and Schuyler know each other? Wrong answers only.",
    "What's one thing you that you think Schuyler should know about Besha?",
    "What are Besha's favorite hobbies?",
    "Do you have any advice for the soon-to-be newlyweds?",
    "Is there anything else you'd like to share with Besha and Schuyler, or their friends and family?",
  ],
  schuyler_questions: [
    "First off, would you please introduce yourself to our listeners, and say a few words about who you are?",
    "How do you know Schuyler?",
    "Tell us your favorite story about Schuyler. It could be something charming, humorous, or, ideally, a little embarrassing.",
    "What's Schuyler's favorite food?",
    "How do Besha and Schuyler know each other? Wrong answers only.",
    "What's one thing you that you think Besha ought to know about Schuyler?",
    "What are Schuyler's favorite hobbies?",
    "Do you have any advice for the soon-to-be newlyweds?",
    "Is there anything else you'd like to share with Besha and Schuyler, or their friends and family?",
  ],
  prompt_to_continue: "Whenever you're ready to move on, press star.",
  interstitial: [
    "Great!",
    "Awesome.",
    "Thank you.",
    "Cool.",
    "Lovely.",
    "Brilliant!",
  ],
  skip: ["Right then.", "Got it.", "Okay.", "Sure.", "Moving along."],
  no_more_questions:
    "That's all the questions we had for now! Well done. If you wish to start over, perhaps to answer questions about ${other} instead, you can press star." +
    "To wrap up, press any other key.",
  goodbye:
    "Thanks for joining us for the podcast. We'll see you at the wedding! Bye!!!",
  error:
    "Oh dear. Something's gone sideways. Schuyler is probably to blame. I'll let him know. Please try calling back later. Bye!",
};

export const voiceArgs: SayAttributes = {
  voice: "Google.en-GB-Standard-B",
  language: "en-GB",
};

export const getMessage = (
  slug: string,
  values: { [key: string]: string } = {},
  exclude?: string[],
) => {
  if (values.literal) {
    return slug;
  }
  const value = messages[slug];
  if (!value) {
    throw new Error(`Missing message: ${slug}`);
  }
  let msg = "";
  if (typeof value == "string") {
    msg = value;
  } else if (exclude) {
    msg = value.filter((v: string) => !exclude.includes(v))[0];
  } else {
    msg = value[Math.floor(Math.random() * value.length)];
  }
  return (
    msg && msg.replace(/\${(.*?)}/g, (_, match) => values[match.trim()] || "")
  );
};
