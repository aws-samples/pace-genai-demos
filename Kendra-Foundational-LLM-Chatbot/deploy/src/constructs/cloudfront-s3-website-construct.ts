/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as cdk from "aws-cdk-lib";
import { iam } from "cdk-nag/lib/rules";
import { Construct } from "constructs";

export interface CloudFrontS3WebSiteConstructProps extends cdk.StackProps {
  /**
   * The path to the build directory of the web site, relative to the project root
   * ex: "./app/build"
   */
  readonly webSiteBuildPath: string;

  /**
   * The Arn of the WafV2 WebAcl.
   */
  readonly webAclArn?: string;
}

const defaultProps: Partial<CloudFrontS3WebSiteConstructProps> = {};

/**
 * Deploys a CloudFront Distribution pointing to an S3 bucket containing the deployed web application {webSiteBuildPath}.
 * Creates:
 * - S3 bucket
 * - CloudFrontDistribution
 * - OriginAccessIdentity
 *
 * On redeployment, will automatically invalidate the CloudFront distribution cache
 */
export class CloudFrontS3WebSiteConstruct extends Construct {
  /**
   * The origin access identity used to access the S3 website
   */
  public originAccessIdentity: cdk.aws_cloudfront.OriginAccessIdentity;

  /**
   * The cloud front distribution to attach additional behaviors like `/api`
   */
  public cloudFrontDistribution: cdk.aws_cloudfront.Distribution;

  constructor(
    parent: Construct,
    name: string,
    props: CloudFrontS3WebSiteConstructProps
  ) {
    super(parent, name);

    props = { ...defaultProps, ...props };

    // When using Distribution, do not set the s3 bucket website documents
    // if these are set then the distribution origin is configured for HTTP communication with the
    // s3 bucket and won't configure the cloudformation correctly.
    const siteBucket = new cdk.aws_s3.Bucket(this, "WebApp", {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    siteBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        sid: "EnforceTLS",
        effect: cdk.aws_iam.Effect.DENY,
        principals: [new cdk.aws_iam.AnyPrincipal()],
        actions: ["s3:*"],
        resources: [siteBucket.bucketArn, siteBucket.bucketArn + "/*"],
        conditions: { Bool: { "aws:SecureTransport": "false" } },
      })
    );

    const originAccessIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
      this,
      "OriginAccessIdentity"
    );
    siteBucket.grantRead(originAccessIdentity);

    const s3origin = new cdk.aws_cloudfront_origins.S3Origin(siteBucket, {
      originAccessIdentity: originAccessIdentity,
    });

    const cloudFrontDistribution = new cdk.aws_cloudfront.Distribution(
      this,
      "WebAppDistribution",
      {
        defaultBehavior: {
          origin: s3origin,
          cachePolicy: new cdk.aws_cloudfront.CachePolicy(this, "CachePolicy", {
            defaultTtl: cdk.Duration.hours(1),
          }),
          allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy:
            cdk.aws_cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        },
        errorResponses: [
          {
            httpStatus: 404,
            ttl: cdk.Duration.hours(0),
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
        defaultRootObject: "index.html",
        webAclId: props.webAclArn,
        minimumProtocolVersion:
          cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021, // Required by security
      }
    );

    new cdk.aws_s3_deployment.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [cdk.aws_s3_deployment.Source.asset(props.webSiteBuildPath)], // from root directory
      destinationBucket: siteBucket,
      distribution: cloudFrontDistribution, // this assignment, on redeploy, will automatically invalidate the cloudfront cache
      distributionPaths: ["/*"],
      // default of 128 isn't large enough for larger website deployments. More memory doesn't improve the performance.
      // You want just enough memory to guarantee deployment
      memoryLimit: 512,
    });

    // export any cf outputs
    new cdk.CfnOutput(this, "SiteBucket", { value: siteBucket.bucketName });
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: cloudFrontDistribution.distributionId,
    });
    new cdk.CfnOutput(this, "CloudFrontDistributionDomainName", {
      value: `https://${cloudFrontDistribution.distributionDomainName}`,
    });

    // assign public properties
    this.originAccessIdentity = originAccessIdentity;
    this.cloudFrontDistribution = cloudFrontDistribution;
  }
}
