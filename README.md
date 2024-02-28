# RoboYoz

## Overview

A Twilio IVR application written in TypeScript and hosted in AWS Lambda using DynamoDB, S3, and SNS.

The CDK deployment stack lives in [lib/roboyoz-service.ts](lib/roboyoz-service.ts).

The application logic lives in [app/](app/).

* [index.ts](app/index.ts) contains the Lambda handler and associated helper routines.
* The Lambda handler dispatches incoming events to functions in the [actions.ts](app/actions.ts) module based on the HTTP request path, using a callback map to allow the action handler to modify the TwiML response.
* [messages.ts](app/messages.ts) consolidates the IVR response strings.
* [interview.ts](app/interview.ts) provides the DynamoDB database model that tracks the caller state and provides continuity between calls.

## Deployment

```sh
npm run build && cdk deploy
```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
