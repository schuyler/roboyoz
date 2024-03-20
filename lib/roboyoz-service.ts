import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

import { actions } from "../app/actions";
import * as interview from "../app/interview";
import * as call from "../app/call";
import settings from "./settings.json";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

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

    // Configure the bucket CORS policy to allow connections from anywhere.
    bucket.addCorsRule({
      allowedOrigins: ["*"],
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST],
      allowedHeaders: ["*"],
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

    // Policy statement to grant CloudWatch Logs permissions to Lambda functions
    const cloudwatchLogs = new iam.PolicyStatement({
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      resources: ["arn:aws:logs:*:*:*"],
    });

    // Create a REST API with Lambda integrations
    const api = new apigateway.RestApi(this, "roboyoz-api", {
      restApiName: "RoboYoz",
      description: "It's not actually Yoz. Except maybe it is.",
      binaryMediaTypes: ["image/*", "audio/*"],
    });

    // Add the token handler to the API gateway
    const tokenHandler = new lambda.Function(this, "tokenHandler", {
      ...lambdaConfig,
      handler: "handler.tokenHandler",
    });
    tokenHandler.addToRolePolicy(cloudwatchLogs);
    const tokenResource = api.root.addResource("token");
    const tokenIntegration = new apigateway.LambdaIntegration(tokenHandler);
    tokenResource.addMethod("GET", tokenIntegration);

    /* Create a role that grants read-only access to the bucket */
    const s3AssetRole = new iam.Role(this, "s3AssetRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    /* Grant read-only S3 permissions to the role */
    bucket.grantRead(s3AssetRole);
    /* Create an AWS integration for the S3 bucket. Astonishingly, this was the only lucid example
      I could readily find on the Internet:
      https://aws.plainenglish.io/integrating-aws-api-gateway-and-aws-s3-using-aws-cdk-41118c1b01c3
    */

    const s3Integration = new apigateway.AwsIntegration({
      service: "s3",
      integrationHttpMethod: "GET",
      // path: `${bucket.bucketName}/{folder}/{key}`,
      path: `${bucket.bucketName}/assets/{key}`,
      options: {
        credentialsRole: s3AssetRole,
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Content-Type":
                "integration.response.header.Content-Type",
            },
          },
        ],

        requestParameters: {
          // "integration.request.path.folder": "method.request.path.folder",
          "integration.request.path.key": "method.request.path.key",
        },
      },
    });
    /* Create a reosurce underneath the api root that matches anything under s3/ */
    const s3AssetResource = api.root
      .addResource("assets")
      //.addResource("{folder}")
      .addResource("{key}");
    s3AssetResource.addMethod("GET", s3Integration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Content-Type": true,
          },
        },
      ],
      requestParameters: {
        //"method.request.path.folder": true,
        "method.request.path.key": true,
        "method.request.header.Content-Type": true,
      },
    });

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

    // For each application Lambda, grant permissions and create API resources
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
      handler.addToRolePolicy(cloudwatchLogs);
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

    /*
    Things I had to do manually:
    - Create the hosted zone in Route 53
    - Point the domain nameserver with the registrar at Route 53
    - Create a certificate in ACM _in us-east-1_ (it won't work in other regions!)
    - Create the interview subdomain in Route 53 and alias it to the CloudFront distribution
      * this could be done in CDK if I wanted to specify the environment blah blah
    */
    const certificate = Certificate.fromCertificateArn(
      this,
      "ssl_cert",
      settings.CERTIFICATE_ARN,
    );
    const region = cdk.Stack.of(this).region;
    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "distribution",
      {
        defaultRootObject: "/assets/index.html",
        originConfigs: [
          {
            customOriginSource: {
              domainName:
                // There must be a better way to get this domain name from the API Gateway construct
                api.restApiId + ".execute-api." + region + ".amazonaws.com",
              originPath: "/prod",
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                forwardedValues: {
                  queryString: true,
                },
                // allow POST requests
                allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                defaultTtl: cdk.Duration.seconds(0),
                viewerProtocolPolicy:
                  cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              },
            ],
          },
        ],
        viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
          certificate,
          {
            aliases: [settings.DOMAIN],
          },
        ),
      },
    );

    // Emit the domain name of the distribution as a cfn output
    new cdk.CfnOutput(this, "distributionDomainName", {
      value: distribution.distributionDomainName,
    });
  }
}
