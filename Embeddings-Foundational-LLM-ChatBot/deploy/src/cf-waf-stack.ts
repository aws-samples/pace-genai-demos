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
// --  Linkedin:      https://www.linkedin.com/in/ztanruan
// --  Date:          04/11/2023
// --  Purpose:       CDK WAF Configuration
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import {
  Wafv2BasicConstruct,
  WafV2Scope,
} from "./constructs/wafv2-basic-construct";

export class CfWafStack extends cdk.Stack {
  /**
   * Name of the WafArn SSM parameter
   */
  public ssmWafArnParameterName: string;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // ssm parameter name must be unique in a region
    this.ssmWafArnParameterName = "waf_acl_arn_" + this.stackName;

    // requires us-east-1 for deployment to work due to limitations with the service.
    // for deployments outside of us-east-1 deploy waf separately
    const wafv2CF = new Wafv2BasicConstruct(this, "Wafv2CF", {
      wafScope: WafV2Scope.CLOUDFRONT,
      rules: [
        {
          name: "AWS-AWSManagedRulesCommonRuleSet",
          priority: 1,
          overrideAction: {
            none: {},
          },
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesCommonRuleSet",
              vendorName: "AWS",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "awsCommonRules",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    new cdk.aws_ssm.StringParameter(this, "waf_acl_arn", {
      parameterName: this.ssmWafArnParameterName,
      description: "WAF ACL ARN",
      stringValue: wafv2CF.webacl.attrArn,
    });
  }
}
