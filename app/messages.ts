const messages: Record<string, string | string[]> = {
  greeting:
    "Hello, and welcome to the Erle-Grey Wedding Podcast Interview Hotline. I am your host, NOT Yoz Grahame.",
  request_subject: "Are you calling about Besha or Schuyler?",
  no_idea_who: "Sorry, I have no idea who that is. Let's try again.",
  subject_chosen:
    "You can leave ${name} a message now. Hit pound or hang up when you're done.",
  goodbye: "Thanks! See ya.",
};

export const getMessage = (
  slug: string,
  values: { [key: string]: string } = {},
): string => {
  const msg = messages[slug] as string;
  return msg.replace(/\${(.*?)}/g, (_, match) => values[match.trim()] || "");
};
