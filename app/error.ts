import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

export const sendErrorToSNS = async (error: any) => {
  try {
    const client = new SNSClient({});
    const exceptionMessage =
      error instanceof Error
        ? { Subject: error.message, Message: error.stack }
        : { Subject: String(error).substring(0, 80), Message: String(error) };
    const topicArn = process.env.SNS_ERROR_TOPIC;
    if (!topicArn) {
      throw new Error("Can't find SNS_ERROR_TOPIC to publish");
    }
    await client.send(
      new PublishCommand({
        ...exceptionMessage,
        TopicArn: topicArn,
      }),
    );
  } catch (snsError) {
    console.error("Error publishing message to SNS topic:", snsError);
  }
};
