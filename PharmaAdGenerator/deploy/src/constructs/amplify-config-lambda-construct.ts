// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as apigw from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigwIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as apigwAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { NagSuppressions } from "cdk-nag";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface AmplifyConfigLambdaConstructProps extends cdk.StackProps {
    /**
     * The Cognito UserPoolId to authenticate users in the front-end
     */
    readonly userPoolId: string;

    /**
     * The Cognito AppClientId to authenticate users in the front-end
     */
    readonly appClientId: string;

    /**
     * The Cognito IdentityPoolId to authenticate users in the front-end
     */
    readonly identityPoolId: string;

    /**
     * The ApiGatewayV2 HttpApi to attach the lambda
     */
    readonly api: apigw.HttpApi;
}

const defaultProps: Partial<AmplifyConfigLambdaConstructProps> = {};

/**
 * Deploys a lambda to the api gateway under the path `/api/amplify-config`.
 * The route is unauthenticated.  Use this with `apigatewayv2-cloudfront` for a CORS free
 * amplify configuration setup
 */
export class AmplifyConfigLambdaConstruct extends Construct {
    constructor(parent: Construct, name: string, props: AmplifyConfigLambdaConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };

        // get the parent stack reference for the stackName and the aws region
        const stack = cdk.Stack.of(this);

        const authorizerFn = new cdk.aws_lambda.Function(this, "AuthorizerLambda", {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_8,
            handler: "index.lambda_handler",
            code: cdk.aws_lambda.Code.fromInline(this.getAuthorizerLambdaCode()), // TODO: support both python and typescript versions
            timeout: cdk.Duration.seconds(15),
        });
        authorizerFn.grantInvoke(new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com"));
        const authorizer = new apigwAuthorizers.HttpLambdaAuthorizer("authorizer", authorizerFn, {
            authorizerName: "CognitoConfigAuthorizer",
            resultsCacheTtl: cdk.Duration.seconds(3600),
            identitySource: ["$context.routeKey"],
            responseTypes: [apigwAuthorizers.HttpLambdaResponseType.SIMPLE],
        });

        const lambdaFn = new cdk.aws_lambda.Function(this, "AmplifyConfigLambda", {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_8,
            handler: "index.lambda_handler",
            code: cdk.aws_lambda.Code.fromInline(this.getPythonLambdaFunction()), // TODO: support both python and typescript versions
            timeout: cdk.Duration.seconds(15),
            environment: {
                USER_POOL_ID: props.userPoolId,
                APP_CLIENT_ID: props.appClientId,
                IDENTITY_POOL_ID: props.identityPoolId,
                REGION: stack.region,
            },
        });

        // add lambda policies
        // TODO: replace with specific dynamo resource assignment when table is in CDK
        lambdaFn.grantInvoke(new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com"));

        // add lambda integration
        const lambdaFnIntegration = new apigwIntegrations.HttpLambdaIntegration(
            "apiInt",
            lambdaFn,
            {}
        );

        // add route to the api gateway
        props.api.addRoutes({
            path: "/api/amplify-config",
            methods: [apigw.HttpMethod.GET],
            integration: lambdaFnIntegration,
            authorizer: authorizer,
        });

        // add nag suppressions for the amplify config api route
        NagSuppressions.addResourceSuppressionsByPath(
            stack,
            `${stack.stackName}/Api/${props.api.node.id}/GET--api--amplify-config/Resource`,
            [
                {
                    id: "AwsSolutions-APIG4",
                    reason: "Amplify config is a unprotected API returning public data",
                },
            ]
        );
    }

    private getAuthorizerLambdaCode(): string {
        return `
def lambda_handler(event, context): 
    return {
        "isAuthorized": True
    }
        `;
    }

    private getPythonLambdaFunction(): string {
        return `
import json
import os

def lambda_handler(event, context):
  region = os.getenv("REGION", None)
  user_pool_id = os.getenv("USER_POOL_ID", None)
  app_client_id = os.getenv("APP_CLIENT_ID", None)
  identity_pool_id = os.getenv("IDENTITY_POOL_ID", None)
  response = {
      "region": region,
      "userPoolId": user_pool_id,
      "appClientId": app_client_id,
      "identityPoolId": identity_pool_id,
  }
  return {
      "statusCode": "200",
      "body": json.dumps(response),
      "headers": {
          "Content-Type": "application/json"
      },
  }
      `;
    }
}
