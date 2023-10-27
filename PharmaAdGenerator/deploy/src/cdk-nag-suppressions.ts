// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

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
            {
                id: "AwsSolutions-COG2",
                reason: "Cognito MFA not required for prototype",
            },
            {
                id: "AwsSolutions-COG3",
                reason: "Cognito advanced security mode not required for prototype",
            },
            {
                id: "AwsSolutions-IAM4",
                reason: "AWS managed policies allowed for prototype",
            },
            { id: "AwsSolutions-IAM5", reason: "IAM wildcard allowed" },
            {
                id: "AwsSolutions-L1",
                reason: "Latest runtime not required for prototype",
            },
            {
                id: "AwsSolutions-S1",
                reason: "S3 server access logs not required for prototype",
            },
            {
                id: "AwsSolutions-VPC7",
                reason: "VPC flow logs not required for prototype",
            },
            {
                id: "AwsSolutions-SMG4",
                reason: "Secrets Manager rotation not required for prototype",
            },
            {
                id: "AwsSolutions-OS3",
                reason: "Whitelisted ips not required for prototype",
            },
            { id: "AwsSolutions-OS5", reason: "suppressed" },
            { id: "AwsSolutions-EC28", reason: "suppressed" },
            { id: "AwsSolutions-EC29", reason: "suppressed" },
        ],
        true,
    );
};
