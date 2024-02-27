import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import RoboYozService from "./roboyoz-service";

export class RoboYozStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new RoboYozService(this, "RoboYoz");
  }
}
