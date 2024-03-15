/* Create a new CDK construct to host the DNS configuration for this stack */

import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { CloudFrontWebDistribution } from "aws-cdk-lib/aws-cloudfront";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";

export class RoboYozDNS extends Construct {
  /* Create the construct, with the Cloudfront distribution domain name passed in as an argument */
  constructor(scope: Construct, id: string, props: { restApi: RestApi }) {
    super(scope, id);
    console.log("restApiUrl: ", props.restApi.urlForPath("/"));
    /* Create a Cloudfront distribution for the API */
    const distribution = new CloudFrontWebDistribution(
      this,
      "roboyoz-distribution",
      {
        originConfigs: [
          {
            customOriginSource: {
              domainName: props.restApi.urlForPath("/").slice(8), // Remove the https:// prefix
            },
            // Ensure that any requests to the root of the distribution are sent to the /prod/ path of the API
            // This is necessary because the API Gateway does not support the root path as an origin
            behaviors: [
              {
                isDefaultBehavior: true,
                pathPattern: "/prod/*",
              },
            ],
          },
        ],
      },
    );

    /* Connect Route 53 to point interview.erlegrey.com to the Cloudfront distribution */
    const zone = HostedZone.fromLookup(this, "roboyoz-zone", {
      domainName: "erlegrey.com",
    });
    new ARecord(this, "roboyoz-record", {
      zone,
      recordName: "interview",
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}
