/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as cdk from "aws-cdk-lib";

import { CfWafStack } from "./cf-waf-stack";
import { AppStack } from "./app-stack";
import { AwsSolutionsChecks } from "cdk-nag";
import { suppressCdkNagRules } from "./cdk-nag-suppressions";

const app = new cdk.App();

const stackName = "guru-kendra-chatbot";
const account =
  app.node.tryGetContext("account") ||
  process.env.CDK_DEPLOY_ACCOUNT ||
  process.env.CDK_DEFAULT_ACCOUNT;
const region =
  app.node.tryGetContext("region") ||
  process.env.CDK_DEPLOY_REGION ||
  process.env.CDK_DEFAULT_REGION;

// Deploy Waf for CloudFront in us-east-1
const cfWafStackName = stackName + "-waf";

const cfWafStack = new CfWafStack(app, cfWafStackName, {
  env: {
    account: account,
    region: "us-east-1",
  },
  stackName: cfWafStackName,
});

// Deploy App Stack
const appStack = new AppStack(app, stackName, {
  env: {
    account: account,
    region: region,
  },
  stackName: stackName,
  ssmWafArnParameterName: cfWafStack.ssmWafArnParameterName,
  ssmWafArnParameterRegion: cfWafStack.region,
});

appStack.addDependency(cfWafStack);

// Add Aws Solutions Checks and suppress rules
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ logIgnores: true }));
suppressCdkNagRules(cfWafStack);
suppressCdkNagRules(appStack);

app.synth();
