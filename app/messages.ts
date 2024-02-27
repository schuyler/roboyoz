const messages: Record<string, string | string[]> = {
  greeting:
    "Hello, and welcome to the Erle-Grey Wedding Podcast Interview Hotline. I am your host, NOT Yoz Grahame.",
  introduction:
    "I'd love to ask you a few questions about the bride and/or groom for a one-off podcast episode. " +
    "Your responses may be shared with the other wedding guests in whole, in part, or not at all, depending on how funny they are.",
  welcome_back:
    "Welcome back. I see you've called before, so let's pick up where we left off.",
  request_subject:
    "Should we discuss your experiences with Besha or with Schuyler?",
  no_idea_who:
    "Sorry, I have no idea who that is. Let's try again. You can press 1 for Besha, or 2 for Schuyler.",
  subject_chosen:
    "Let's chat about ${name}. You can press pound at any time to skip ahead to the next question.",
  besha_questions: [
    "First off, would you please introduce yourself to our listeners, and say a few words about who you are?",
    "How do you know Besha?",
    "Tell us your favorite story about Besha. It could be something funny, heartwarming, or, ideally, a little embarrassing.",
    "What's one thing you that you think Schuyler ought to know about Besha?",
    "Do you have any hopes or wishes you'd like to express for the bride and groom?",
  ],
  schuyler_questions: [
    "First off, would you please introduce yourself to our listeners, and say a few words about who you are?",
    "How do you know Schuyler?",
    "Tell us your favorite story about Schuyler. It could be something charming, humorous, or, ideally, a little embarrassing.",
    "What's one thing you that you think Besha ought to know about Schuyler?",
    "Do you have any hopes or wishes you'd like to express for the bride and groom?",
  ],
  interstitial: [
    "Great!",
    "Awesome.",
    "Thank you.",
    "Cool.",
    "Lovely.",
    "Brilliant!",
  ],
  goodbye:
    "Thanks for joining us for the podcast. See you at the wedding! Bye now!",
  error:
    "Oh dear. Something's gone sideways. Schuyler is probably to blame. I'll let him know. Please try calling back later. Bye!",
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
