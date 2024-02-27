const messages: Record<string, string | string[]> = {
  greeting:
    "Hello, and welcome to the Erle-Grey Wedding Podcast Interview Hotline. I am your host, NOT Yoz Grahame.",
  request_subject: "Are you calling about Besha or Schuyler?",
  no_idea_who: "Sorry, I have no idea who that is. Let's try again.",
  subject_chosen:
    "I'd love to ask you a few questions about ${name}. You can press pound at any time to skip ahead to the next question. " +
    "First off, can you introduce yourself to our listeners, and say a few words about who you are?",
  besha_questions: [
    "How do you know Besha?",
    "Tell us your favorite story about Besha.",
    "What's one thing you that you think Schuyler ought to know about Besha?",
  ],
  schuyler_questions: [
    "How do you know Schuyler?",
    "Tell us your favorite story about Schuyler.",
    "What's one thing you that you think Besha ought to know about Schuyler?",
  ],
  interstitial: [
    "Great!",
    "Awesome.",
    "Thank you.",
    "Cool.",
    "You can say that again.",
  ],
  goodbye:
    "Thanks for joining us for the podcast. See you at the wedding! Bye now!",
  error:
    "Oh dear. Something's gone sideways. Schuyler is probably to blame. I'll let him know. Try calling back later, please? Bye!",
};

export const getMessage = (
  slug: string,
  values: { [key: string]: string } = {},
) => {
  const value = messages[slug];
  if (!value) {
    throw new Error(`Missing message: ${slug}`);
  }
  const msg =
    typeof value == "string"
      ? value
      : value[Math.floor(Math.random() * value.length)];
  return msg.replace(/\${(.*?)}/g, (_, match) => values[match.trim()] || "");
};
