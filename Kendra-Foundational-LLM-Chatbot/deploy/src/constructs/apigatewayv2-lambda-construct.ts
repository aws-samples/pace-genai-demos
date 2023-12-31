/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as apigw from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigwIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ApiGatewayV2LambdaConstructProps extends cdk.StackProps {
  /**
   * The lambda function
   */
  readonly lambdaFn: cdk.aws_lambda.Function;
  /**
   * The apigatewayv2 route path
   */
  readonly routePath: string;
  /**
   * Api methods supported by this API
   */
  readonly methods: Array<apigw.HttpMethod>;
  /**
   * The ApiGatewayV2 HttpApi to attach the lambda
   */
  readonly api: apigw.HttpApi;
}

const defaultProps: Partial<ApiGatewayV2LambdaConstructProps> = {};

/**
 * Deploys a lambda and attaches it to a route on the apigatewayv2
 */
export class ApiGatewayV2LambdaConstruct extends Construct {
  constructor(
    parent: Construct,
    name: string,
    props: ApiGatewayV2LambdaConstructProps
  ) {
    super(parent, name);

    props = { ...defaultProps, ...props };

    // add lambda policies
    props.lambdaFn.grantInvoke(
      new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com")
    );

    // add lambda integration
    const lambdaFnIntegration = new apigwIntegrations.HttpLambdaIntegration(
      "apiInt",
      props.lambdaFn,
      {}
    );

    // add route to the api gateway
    props.api.addRoutes({
      path: props.routePath,
      methods: props.methods,
      integration: lambdaFnIntegration,
    });
  }
}
