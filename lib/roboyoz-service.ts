// import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

import settings from "./settings.json";
// import * as s3 from "aws-cdk-lib/aws-s3";

export default class RoboYozService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create an S3 bucket
    const bucket = new s3.Bucket(this, "roboyoz-bucket", {
      bucketName: "roboyoz",
    });

    // Create an IAM user
    const user = new iam.User(this, "roboyoz-twilio");

    // Grant PutObject permission to the IAM user on the S3 bucket
    // bucket.grantPut(user);
    // Create an IAM policy statement granting PutObject permission for the specified prefix
    const putObjectPolicy = new iam.PolicyStatement({
      actions: ["s3:PutObject"],
      resources: [`${bucket.bucketArn}/recordings*`], // Specify the ARN of the prefix
    });

    // Attach the IAM policy statement to the IAM user
    user.addToPolicy(putObjectPolicy);

    const handler = new lambda.Function(this, "RoboYoz", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("dist/bundle.zip"),
      handler: "handler.handler",
      environment: {
        ...settings,
      },
    });

    bucket.grantReadWrite(handler);

    const api = new apigateway.RestApi(this, "roboyoz-api", {
      restApiName: "RoboYoz",
      description: "It's not actually Yoz. Except maybe it is.",
    });

    const roboYozIntegration = new apigateway.LambdaIntegration(handler, {
      //requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    api.root.addMethod("POST", roboYozIntegration);

    const resources = ["request_subject", "choose_subject", "goodbye"];
    resources.forEach((path) => {
      const resource = api.root.addResource(path);
      resource.addMethod("POST", roboYozIntegration);
    });
  }
}
