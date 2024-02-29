import { Twilio } from "twilio";

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

// Use Twilio Lookup to get caller's name (costs $.01 per lookup)
export async function getCallerName(phoneNumber: string) {
  const callerDetails = await client.lookups.v2
    .phoneNumbers(phoneNumber)
    .fetch({ fields: "caller_name" });
  return callerDetails.callerName.caller_name;
}
