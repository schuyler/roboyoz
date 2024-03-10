import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sns from "aws-cdk-lib/aws-sns";

import { actions } from "../app/actions";
import * as interview from "../app/interview";
import * as call from "../app/call";
import settings from "./settings.json";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
// import * as s3 from "aws-cdk-lib/aws-s3";

export default class RoboYozService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a DynamoDB table to store interview data
    const interviewTable = new dynamodb.Table(this, interview.tableName, {
      tableName: interview.tableName,
      partitionKey: {
        name: "phoneNumber",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Create a DynamoDB table to store recording data
    const callTable = new dynamodb.Table(this, call.tableName, {
      tableName: call.tableName,
      partitionKey: {
        name: "callSid",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Create an S3 bucket to store recordings
    const bucket = new s3.Bucket(this, "roboyoz-bucket", {
      bucketName: "roboyoz",
    });

    // Create an IAM user for Twilio to use when uploading recordings
    const user = new iam.User(this, "roboyoz-twilio");

    // Grant PutObject permission to the Twilio user on the S3 bucket
    const putObjectPolicy = new iam.PolicyStatement({
      actions: ["s3:PutObject"],
      resources: [`${bucket.bucketArn}/recordings*`], // Specify the ARN of the prefix
    });

    // Attach the PutObject policy statement to the Twilio user
    user.addToPolicy(putObjectPolicy);

    // Create an SNS topic for error notifications
    const errorTopic = new sns.Topic(this, "ErrorTopic", {
      displayName: "RoboYoz errors",
    });
    errorTopic.addSubscription(new EmailSubscription(settings.EMAIL));

    // Base configuration for Lambda functions for voice and web requests
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("dist/bundle.zip"),
      logRetention: 180, // six months
      environment: {
        SNS_ERROR_TOPIC: errorTopic.topicArn,
        ...settings,
      },
    };
    // Create a Lambda function for voice requests
    const voiceHandler = new lambda.Function(this, "voiceHandler", {
      ...lambdaConfig,
      handler: "handler.voiceHandler",
    });
    // Create a Lambda function for web requests
    const webHandler = new lambda.Function(this, "webHandler", {
      ...lambdaConfig,
      handler: "handler.webHandler",
    });

    // Create a REST API with Lambda integrations
    const api = new apigateway.RestApi(this, "roboyoz-api", {
      restApiName: "RoboYoz",
      description: "It's not actually Yoz. Except maybe it is.",
    });

    // For each Lambda function, grant permissions and create API resources
    const lambdaFunctions: [string, lambda.Function][] = [
      ["voice", voiceHandler],
      ["web", webHandler],
    ];

    for (const [path, handler] of lambdaFunctions) {
      // Grant DynamoDB permissions to the Lambda function
      interviewTable.grantReadWriteData(handler);
      callTable.grantReadWriteData(handler);
      // Grant S3 permissions to the Lambda function
      bucket.grantReadWrite(handler);
      // Grant SNS permissions to the Lambda function
      errorTopic.grantPublish(handler);
      // Grant CloudWatch Logs permissions to the Lambda function
      handler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
          ],
          resources: ["arn:aws:logs:*:*:*"],
        }),
      );

      // Create a resource at the root of the API for the Lambda function
      const resource = api.root.addResource(path);
      const integration = new apigateway.LambdaIntegration(handler);
      resource.addMethod("POST", integration);

      // Create a resource for each action in the app
      Object.keys(actions).forEach((action) => {
        const actionResource = resource.addResource(action);
        actionResource.addMethod("POST", integration);
      });
    }
  }
}
