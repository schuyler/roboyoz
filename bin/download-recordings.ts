#!npx ts-node

/* This script will download all the recordings from S3 to a directory specified on the command line.
It will rename each file in the format {caller}-{question}.wav. */

import * as fs from "fs";
import * as path from "path";
import settings from "../lib/settings.json";

import { listCallerPhoneNumbers, loadInterview } from "../app/interview";
import { S3 } from "@aws-sdk/client-s3";

async function main() {
  // Get the directory to save the recordings to
  const saveDir = process.argv[2];
  if (!saveDir) {
    // This is a TypeScript program, so provide usage instructions
    console.error("Usage: npx ts-node download-recordings.ts <saveDir>");
    process.exit(1);
  }

  // Create an S3 client
  const s3 = new S3({});
  // The S3 bucket is defined in settings.S3_ASSET_BUCKET
  const bucket = settings.S3_ASSET_BUCKET;

  // Get a list of all caller phone numbers using await
  const phoneNumbers = await listCallerPhoneNumbers();

  // Loop through each phone number and get the interview record
  for (const phoneNumber of phoneNumbers) {
    const interview = await loadInterview(phoneNumber);

    // Loop through each recording and download it
    for (const recording of interview.recordings) {
      // Construct the base filename of the recording using the callerName and question, and then replace any non-alphanumeric characters with a dash
      const subdir = interview.callerName
        .replace(/^client\W/, "")
        .replace(/[^A-Za-z0-9]+/g, "-");
      const dirname = path.join(saveDir, subdir);
      // Create dirname if it doesn't exist
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      const basename = recording.question
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^\W+|\W+$/g, "")
        .substring(0, 16);
      // The unique ID is the last four characters of the recording.uri
      const uid = recording.uri.substring(recording.uri.length - 4);
      const filename = path.join(dirname, `${basename}-${uid}.wav`);

      // The key is the path to the recording in the bucket
      const key = recording.uri.replace(
        `https://${bucket}.s3.amazonaws.com/`,
        "",
      );

      const data = await s3.getObject({ Bucket: bucket, Key: key });
      // Write the audio data to the file
      const audio = await data.Body?.transformToByteArray();
      if (audio) {
        console.log(filename);
        // Write the audio data to the file
        fs.writeFileSync(filename, Buffer.from(audio));
      } else {
        console.warn("No audio data found for", filename);
      }
    }
  }
}

main();
