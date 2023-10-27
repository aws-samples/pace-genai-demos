/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as cdk from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";

/**
 * General cdk nag suppressions to allow infrastructure that is acceptable for a prototype
 */
export const suppressCdkNagRules = (stack: cdk.Stack) => {
    // General
    NagSuppressions.addStackSuppressions(
        stack,
        [
            {
                id: "AwsSolutions-APIG1",
                reason: "API Gateway access logging not required for prototype",
            },
            {
                id: "AwsSolutions-S10",
                reason: "The S3 Bucket or bucket policy does not require requests to use SSL since Kendra integrates with S3 directly",
            },
            {
                id: "AwsSolutions-CFR1",
                reason: "CloudFront geo restrictions not required for prototype",
            },
            {
                id: "AwsSolutions-CFR3",
                reason: "CloudFront access logging not required for prototype",
            },
            {
                id: "AwsSolutions-CFR4",
                reason: "Custom certificate required for enabling this rule.  Not required for prototype",
            },
            { id: "AwsSolutions-COG2", reason: "Cognito MFA not required for prototype" },
            {
                id: "AwsSolutions-COG3",
                reason: "Cognito advanced security mode not required for prototype",
            },
            {
                id: "AwsSolutions-IAM4",
                reason: "AWS managed policies allowed for prototype",
                appliesTo: [
                    /**
                     * Add AWS managed policies here that you want to allow in the CDK stack.
                     * These should be AWS managed policies that are not overly permissive,
                     * and are thus reasonable to use in prototype code––such as the ones below.
                     *
                     * DO NOT ADD e.g. AmazonSageMakerFullAccess, AmazonS3FullAccess, AWSGlueServiceRole
                     */
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSSMManagedInstanceCore",
                ],
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "IAM wildcard allowed",
                appliesTo: [
                    "Action::s3:Abort*",
                    "Action::s3:DeleteObject*",
                    "Action::s3:GetObject*",
                    "Action::s3:GetBucket*",
                    "Action::s3:Get*",
                    "Action::s3:List*",
                    "Action::s3:Put*",
                    "Action::s3:PutObject*",
                    "Action::s3:PutBucketNotification",
                    "Action::dynamodb:Put*",
                    "Action::dynamodb:Get*",
                    "Action::dynamodb:List*",
                    "Action::dynamodb:Update*",
                    {
                        regex: "/^Resource::arn:aws:s3:.+:\\*$/",
                    },
                    {
                        regex: "/^Resource::arn:<AWS::Partition>:s3:::cdk.+\\*$/",
                    },
                    {
                        regex: "/^Resource::<WebApp.+\\*$/",
                    },
                    {
                        regex: "/^Resource::<.*Bucket.+Arn>.*/\\*$/",
                    },
                    {
                        regex: "/^Resource::<.*Table.+Arn>/index/\\*$/",
                    },
                    {
                        regex: "/^Resource::arn:aws:kendra:::index.+:\\*$/",
                    },
                    {
                        regex: "/^Resource::*.+\\*$/",
                    },
                    
                    
                ],
            },
            { id: "AwsSolutions-L1", reason: "Latest runtime not required for prototype" },
            { id: "AwsSolutions-S1", reason: "S3 server access logs not required for prototype" },
        ],
        true
    );
};
