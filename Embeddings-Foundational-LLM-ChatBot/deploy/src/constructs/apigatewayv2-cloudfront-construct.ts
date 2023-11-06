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
// --  Purpose:       API Gateway Cloudfront Construct
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import * as apigw from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigwAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ApiGatewayV2CloudFrontProps extends cdk.StackProps {
  /**
   * The Cognito UserPool to use for the default authorizer
   */
  readonly userPool: cdk.aws_cognito.UserPool;
  /**
   * The Cognito UserPoolClient to use for the default authorizer
   */
  readonly userPoolClient: cdk.aws_cognito.UserPoolClient;
  /**
   * The CloudFront Distribution to attach the `/api/*` behavior
   */
  readonly cloudFrontDistribution: cdk.aws_cloudfront.Distribution;
}

const defaultProps: Partial<ApiGatewayV2CloudFrontProps> = {};

/**
 * Deploys Api gateway proxied through a CloudFront distribution at route `/api`
 *
 * Any Api's attached to the gateway should be located at `/api/*` so that requests are correctly proxied.
 * Make sure Api's return the header `"Cache-Control" = "no-cache, no-store"` or CloudFront will cache responses
 *
 * CORS: allowed origins for local development:
 * - https://example.com:3000, http://example.com:3000
 *
 * For a more relaxed CORS posture, you can set `allowCredentials: false`, then set `allowOrigins: ["*"]`
 *
 * Creates:
 * - ApiGatewayV2 HttpApi
 */
export class ApiGatewayV2CloudFrontConstruct extends Construct {
  /**
   * Returns the ApiGatewayV2 instance to attach lambdas or other routes
   */
  public apiGatewayV2: apigw.HttpApi;

  constructor(
    parent: Construct,
    name: string,
    props: ApiGatewayV2CloudFrontProps
  ) {
    super(parent, name);

    props = { ...defaultProps, ...props };

    // get the parent stack reference for the stackName and the aws region
    const stack = cdk.Stack.of(this);

    const cognitoAuth = new apigwAuthorizers.HttpUserPoolAuthorizer(
      "apiAuth",
      props.userPool,
      {
        userPoolClients: [props.userPoolClient],
      }
    );

    // init api gateway
    const api = new apigw.HttpApi(this, "Api", {
      apiName: `${stack.stackName}Api`,
      corsPreflight: {
        allowHeaders: [
          "Authorization",
          "Content-Type",
          "Origin",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Amz-User-Agent",
        ],
        allowMethods: [
          // remove methods you don't use for tighter security
          apigw.CorsHttpMethod.DELETE,
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.HEAD,
          apigw.CorsHttpMethod.OPTIONS,
          apigw.CorsHttpMethod.PATCH,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PUT,
        ],
        // allow origins for development.  no origin is needed for cloudfront
        allowOrigins: ["*"],
        exposeHeaders: ["Access-Control-Allow-Origin"],
        maxAge: cdk.Duration.hours(1),
        allowCredentials: false,
      },
      defaultAuthorizer: cognitoAuth,
    });

    const apiUrl = `${api.httpApiId}.execute-api.${stack.region}.amazonaws.com`;
    this.addBehaviorToCloudFrontDistribution(
      props.cloudFrontDistribution,
      apiUrl
    );

    // export any cf outputs
    new cdk.CfnOutput(this, "GatewayUrl", {
      value: `https://${apiUrl}`,
    });

    // assign public properties
    this.apiGatewayV2 = api;
  }

  /**
   * Adds a proxy route from CloudFront /api to the api gateway url
   * @param cloudFrontDistribution
   * @param apiUrl
   */
  private addBehaviorToCloudFrontDistribution(
    cloudFrontDistribution: cdk.aws_cloudfront.Distribution,
    apiUrl: string
  ) {
    cloudFrontDistribution.addBehavior(
      "/api/*",
      new cdk.aws_cloudfront_origins.HttpOrigin(apiUrl, {
        originSslProtocols: [cdk.aws_cloudfront.OriginSslPolicy.TLS_V1_2],
        protocolPolicy: cdk.aws_cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      }),
      {
        cachePolicy: new cdk.aws_cloudfront.CachePolicy(this, "CachePolicy", {
          // required or CloudFront will strip the Authorization token from the request.
          // must be in the cache policy
          headerBehavior:
            cdk.aws_cloudfront.CacheHeaderBehavior.allowList("Authorization"),
          queryStringBehavior:
            cdk.aws_cloudfront.CacheQueryStringBehavior.all(),
          enableAcceptEncodingGzip: true,
          minTtl: cdk.Duration.seconds(0),
          defaultTtl: cdk.Duration.seconds(0),
        }),
        originRequestPolicy: new cdk.aws_cloudfront.OriginRequestPolicy(
          this,
          "OriginRequestPolicy",
          {
            headerBehavior:
              cdk.aws_cloudfront.OriginRequestHeaderBehavior.allowList(
                "User-Agent",
                "Referer"
              ),
            // required or CloudFront will strip all query strings off the request
            queryStringBehavior:
              cdk.aws_cloudfront.OriginRequestQueryStringBehavior.all(),
          }
        ),
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy:
          cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    );
  }
}
