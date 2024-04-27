import { getCallerName } from "../app/caller_id";

// Command-line program to take a phone number and return the caller's name
// Example: npx ts-node test-caller.ts +14158675309

export async function main() {
  const phoneNumber = process.argv[2];
  if (!phoneNumber) {
    console.error("Please provide a phone number");
    process.exit(1);
  }
  const details = await getCallerName(phoneNumber);
  //console.log(`Caller name: ${name}`);
  console.log(JSON.stringify(details, null, 2));
}

main();
