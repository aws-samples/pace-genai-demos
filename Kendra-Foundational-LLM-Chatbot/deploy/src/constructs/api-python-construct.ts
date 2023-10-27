/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { ApiGatewayV2LambdaConstruct } from "./apigatewayv2-lambda-construct";
import { Code, LayerVersion, Runtime, ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Architecture } from "aws-cdk-lib/aws-lambda";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface ApiPythonConstructProps extends cdk.StackProps {
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
	//readonly iamInlinePolicy?: Array<iam.PolicyStatement>;
	readonly memorySize: number;
	readonly role: cdk.aws_iam.Role;
	readonly layers: ILayerVersion[];
	readonly arch: Architecture;

}

const defaultProps: Partial<ApiPythonConstruct> = {};

export class ApiPythonConstruct extends Construct {
	constructor(
		parent: Construct,
		props: ApiPythonConstructProps
	) {
		super(parent, props.name);
		
		props = { ...defaultProps, ...props };
		
		let lambdaPythonFunction = new lambdaPython.PythonFunction(
			this,
			"Fn",
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
			api: props.api
		});
		
	}
}
