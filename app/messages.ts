const messages: Record<string, string | string[]> = {
  greeting:
    "Hello, and welcome to the Erle-Grey Wedding Podcast Interview Hotline. I am your host, NOT Yoz Grahame.",
  introduction:
    "I'd love to ask you a few questions for a one-off podcast episode about the bride and groom. " +
    "Your responses may be shared with the other wedding guests in whole, in part, or not at all, depending on how funny you are." +
    "Please feel free to skip any questions you don't feel like answering. You're supposed to be having a good time, after all." +
    "If you hang up or get disconnected, you can call back at any time and pick up where you left off.",
  welcome_back:
    "I see you've called before. Welcome back. Let's pick up where we left off. If you want to hear the intro again, press star now.",
  request_subject:
    "Shall we discuss your experiences with Besha or with Schuyler?",
  no_idea_who:
    "Sorry, I have no idea who that is. Let's try again. For Besha, press 1. For Schuyler, press 2.",
  subject_chosen:
    "Let's chat about ${name}. To move on to the next question, press pound. To go back to the previous question, press star.",
  besha_questions: [
    "First off, would you please introduce yourself to our listeners, and say a few words about who you are?",
    "How do you know Besha?",
    "Tell us your favorite story about Besha. It could be something funny, heartwarming, or, ideally, a little embarrassing.",
    "What's one thing you that you think Schuyler ought to know about Besha?",
    "Do you have any advice for the soon-to-be newlyweds?",
    "Is there anything else you'd like to share with Besha and Schuyler, or their friends and family?",
  ],
  schuyler_questions: [
    "First off, would you please introduce yourself to our listeners, and say a few words about who you are?",
    "How do you know Schuyler?",
    "Tell us your favorite story about Schuyler. It could be something charming, humorous, or, ideally, a little embarrassing. Or, we call it in England, 'taking the piss'.",
    "What's one thing you that you think Besha ought to know about Schuyler?",
    "Do you have any advice for the soon-to-be newlyweds?",
    "Is there anything else you'd like to share with Besha and Schuyler, or their friends and family?",
  ],
  interstitial: [
    "Great!",
    "Awesome.",
    "Thank you.",
    "Cool.",
    "Lovely.",
    "Brilliant!",
  ],
  no_more_questions:
    "That's all the questions we had for now! Well done. If you wish to start over, perhaps to answer questions about ${other} instead, you can press star." +
    "To wrap up, press any other key.",
  goodbye:
    "Thanks for joining us for the podcast. We'll see you at the wedding! Bye!!!",
  error:
    "Oh dear. Something's gone sideways. Schuyler is probably to blame. I'll let him know. Please try calling back later. Bye!",
};

export const getMessage = (
  slug: string,
  values: { [key: string]: string } = {},
  exclude?: string[],
) => {
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
