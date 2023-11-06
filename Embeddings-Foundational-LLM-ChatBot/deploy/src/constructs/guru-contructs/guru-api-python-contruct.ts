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

import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigw from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { ApiGatewayV2LambdaConstruct } from "../apigatewayv2-lambda-construct";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  Code,
  LayerVersion,
  Runtime,
  ILayerVersion,
} from "aws-cdk-lib/aws-lambda";
import { Architecture } from "aws-cdk-lib/aws-lambda";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface GuruApiPythonConstructProps extends cdk.StackProps {
  readonly runtime: cdk.aws_lambda.Runtime;
  readonly name: string;
  readonly handler: string;
  readonly index: string;
  readonly entry: string;
  readonly timeout: cdk.Duration;
  readonly environment: any;
  readonly routePath: string;
  readonly methods: Array<apigwv2.HttpMethod>;
  readonly api: apigwv2.HttpApi;
  readonly memorySize: number;
  readonly role: cdk.aws_iam.Role;
  readonly layers: ILayerVersion[];
  readonly iamInlinePolicy?: Array<iam.PolicyStatement>;
  readonly arch: Architecture;
}

const defaultProps: Partial<GuruApiPythonConstruct> = {};

export class GuruApiPythonConstruct extends Construct {
  constructor(
    parent: Construct,
    name: string,
    props: GuruApiPythonConstructProps
  ) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const lambdaPythonFunction = new lambdaPython.PythonFunction(
      this,
      props.name + "Fn",
      {
        runtime: props.runtime,
        handler: props.handler,
        index: props.index,
        entry: props.entry,
        timeout: props.timeout,
        environment: props.environment,
        memorySize: props.memorySize,
        role: props.role,
        layers: props.layers,
        architecture: props.arch,
      }
    );

    new ApiGatewayV2LambdaConstruct(this, props.name + "ApiGateway", {
      lambdaFn: lambdaPythonFunction,
      routePath: props.routePath,
      methods: props.methods,
      api: props.api,
    });

    if (props.iamInlinePolicy) {
      lambdaPythonFunction.role?.attachInlinePolicy(
        new iam.Policy(this, props.name + "Policy", {
          statements: props.iamInlinePolicy,
        })
      );
    }
  }
}
