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
// --  Purpose:       Amplify Configuration Construct
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

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

  /**
   * Custom resources lambda url and input bucket name
   */
  readonly documentInputBucketName: string;
  readonly contentUrl: string;
  readonly apiUrl: string;
}

const defaultProps: Partial<AmplifyConfigLambdaConstructProps> = {};

/**
 * Deploys a lambda to the api gateway under the path `/api/amplify-config`.
 * The route is unauthenticated.  Use this with `apigatewayv2-cloudfront` for a CORS free
 * amplify configuration setup
 */
export class AmplifyConfigLambdaConstruct extends Construct {
  constructor(
    parent: Construct,
    name: string,
    props: AmplifyConfigLambdaConstructProps
  ) {
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
    authorizerFn.grantInvoke(
      new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com")
    );
    const authorizer = new apigwAuthorizers.HttpLambdaAuthorizer(
      "authorizer",
      authorizerFn,
      {
        authorizerName: "CognitoConfigAuthorizer",
        resultsCacheTtl: cdk.Duration.seconds(3600),
        identitySource: ["$context.routeKey"],
        responseTypes: [apigwAuthorizers.HttpLambdaResponseType.SIMPLE],
      }
    );

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
        DOCUMENT_INPUT_BUCKET_NAME: props.documentInputBucketName,
        CONTENT_URL: props.contentUrl,
        API_URL: props.apiUrl,
      },
    });

    // add lambda policies
    // TODO: replace with specific dynamo resource assignment when table is in CDK
    lambdaFn.grantInvoke(
      new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com")
    );

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
  content_url = os.getenv("CONTENT_URL", None)
  document_input_bucket_name = os.getenv("DOCUMENT_INPUT_BUCKET_NAME", None)
  api_url = os.getenv("API_URL", None)
  response = {
      "region": region,
      "userPoolId": user_pool_id,
      "appClientId": app_client_id,
      "identityPoolId": identity_pool_id,
      "contentUrl": content_url,
      "documentInputBucketName": document_input_bucket_name,
      "apiUrl": api_url,
      
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
