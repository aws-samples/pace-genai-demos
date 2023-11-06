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
// --  Purpose:       SSM parameter Construct
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

export interface SsmParameterReaderConstructProps extends cdk.StackProps {
  readonly ssmParameterName: string;
  readonly ssmParameterRegion: string;
  /**
   * Sets the physical resource id to current date to force a pull of the parameter on subsequent
   * deploys
   *
   * @default false
   */
  readonly pullEveryTime?: boolean;
}

const defaultProps: Partial<SsmParameterReaderConstructProps> = {
  pullEveryTime: false,
};

/**
 * Deploys the SsmParameterReaderConstruct construct
 *
 * Reads a inter / intra region parameter by name.
 *
 */
export class SsmParameterReaderConstruct extends Construct {
  public ssmParameter: cdk.custom_resources.AwsCustomResource;

  constructor(
    parent: Construct,
    name: string,
    props: SsmParameterReaderConstructProps
  ) {
    super(parent, name);

    props = { ...defaultProps, ...props };

    const stack = cdk.Stack.of(this);

    const physicalResourceId = props.pullEveryTime
      ? Date.UTC.toString()
      : `${props.ssmParameterName}-${props.ssmParameterRegion}`;

    this.ssmParameter = new cdk.custom_resources.AwsCustomResource(
      this,
      "Param",
      {
        onUpdate: {
          service: "SSM",
          action: "getParameter",
          parameters: { Name: `${props.ssmParameterName}` },
          region: props.ssmParameterRegion,
          physicalResourceId:
            cdk.custom_resources.PhysicalResourceId.of(physicalResourceId),
        },
        policy: cdk.custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [
            `arn:aws:ssm:${props.ssmParameterRegion}:${stack.account}:parameter/${props.ssmParameterName}`,
          ],
        }),
      }
    );
  }

  /**
   * @returns string value of the parameter
   */
  public getValue() {
    return this.ssmParameter.getResponseField("Parameter.Value");
  }
}
