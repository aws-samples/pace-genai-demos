// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// --
// --  Author:        Jin Tan Ruan
// --  Date:          04/11/2023
// --  Purpose:       CDK Stack Configuration
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import * as cdk from "aws-cdk-lib";

import { AwsSolutionsChecks } from "cdk-nag";
import { AppStack } from "./app-stack";
import { suppressCdkNagRules } from "./cdk-nag-suppressions";
import { CfWafStack } from "./cf-waf-stack";

const app = new cdk.App();

const stackName = "guru-pharma";
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
  resourcePrefix: "ad-studio",
});

appStack.addDependency(cfWafStack);

// Add Aws Solutions Checks and suppress rules
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ logIgnores: true }));
suppressCdkNagRules(cfWafStack);
suppressCdkNagRules(appStack);

app.synth();
