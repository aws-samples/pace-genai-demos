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
// --  Purpose:       CDK Resources
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import * as cdk from "aws-cdk-lib";
import { RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import {
  Architecture,
  Code,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { ApiGatewayV2LambdaConstruct } from "./constructs/apigatewayv2-lambda-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";

export interface AppStackProps extends cdk.StackProps {
  readonly ssmWafArnParameterName: string;
  readonly ssmWafArnParameterRegion: string;
  readonly resourcePrefix: string;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const webAppBuildPath = "../web-app/build";
    const awsAccountId = cdk.Stack.of(this).account;
    const awsRegion = cdk.Stack.of(this).region;

    const documentInputBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "documentLibraryBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        eventBridgeEnabled: true,
        autoDeleteObjects: true,
      }
    );

    documentInputBucket.addCorsRule({
      allowedOrigins: ["*"],
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.DELETE,
        s3.HttpMethods.HEAD,
      ],
      allowedHeaders: ["*"],
      exposedHeaders: ["ETag"],
      maxAge: 3000,
    });

    const cognito = new CognitoWebNativeConstruct(this, "Cognito", {
      documentInputLibraryBucketArn: documentInputBucket.bucketArn,
    });
    documentInputBucket.grantReadWrite(cognito.authenticatedRole);

    const cfWafWebAcl = new SsmParameterReaderConstruct(
      this,
      "SsmWafParameter",
      {
        ssmParameterName: props.ssmWafArnParameterName,
        ssmParameterRegion: props.ssmWafArnParameterRegion,
      }
    ).getValue();

    documentInputBucket.grantReadWrite(cognito.authenticatedRole);

    const website = new CloudFrontS3WebSiteConstruct(this, "WebApp", {
      webSiteBuildPath: webAppBuildPath,
      webAclArn: cfWafWebAcl,
    });

    const api = new ApiGatewayV2CloudFrontConstruct(this, "Api", {
      cloudFrontDistribution: website.cloudFrontDistribution,
      userPool: cognito.userPool,
      userPoolClient: cognito.webClientUserPool,
    });

    const imageOutputBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "imageOutputBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        eventBridgeEnabled: true,
        autoDeleteObjects: true,
      }
    );

    const referenceSpecificationsTable = new dynamodb.Table(
      this,
      props.resourcePrefix + "referenceSpecificationsTable",
      {
        billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
        pointInTimeRecovery: true,
      }
    );

    const textractExtractTopicKey = new cdk.aws_kms.Key(
      this,
      props.resourcePrefix + "textractExtractTopicKey",
      { enableKeyRotation: true }
    );

    const textractExtractSNSTopic = new cdk.aws_sns.Topic(
      this,
      props.resourcePrefix + "textractExtractSNSTopic",
      {
        topicName: `textractExtractSNSTopic-${cdk.Stack.of(this).stackName}`,
        masterKey: textractExtractTopicKey,
      }
    );

    const textractExtractTextractRole = new iam.Role(
      this,
      props.resourcePrefix + "textractExtractTextractRole",
      {
        assumedBy: new iam.ServicePrincipal("textract.amazonaws.com"),
      }
    );

    textractExtractSNSTopic.grantPublish(textractExtractTextractRole);
    textractExtractTextractRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kms:Decrypt", "kms:GenerateDataKey"],
        resources: [textractExtractTopicKey.keyArn],
      })
    );

    const textractExtractHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "textractExtractHandlerFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "trigger_extraction.py",
        entry: "../api/text-textract",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DDB_TABLE_NAME: referenceSpecificationsTable.tableName,
          SNS_TOPIC_ARN: textractExtractSNSTopic.topicArn,
          SNS_ROLE_ARN: textractExtractTextractRole.roleArn,
        },
      }
    );

    textractExtractHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "textract:StartDocumentTextDetection",
          "textract:StartDocumentAnalysis",
          "textract:GetDocumentTextDetection",
          "textract:GetDocumentAnalysis",
        ],
        resources: ["*"],
      })
    );

    textractExtractHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "textract:StartDocumentTextDetection",
          "textract:StartDocumentAnalysis",
          "textract:GetDocumentTextDetection",
          "textract:GetDocumentAnalysis",
        ],
        resources: ["*"],
      })
    );

    textractExtractHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:PutItem",
        ],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecificationsTable.tableName}`,
        ],
      })
    );

    documentInputBucket.grantRead(textractExtractHandlerFn);

    documentInputBucket.addEventNotification(
      cdk.aws_s3.EventType.OBJECT_CREATED_PUT,
      new cdk.aws_s3_notifications.LambdaDestination(textractExtractHandlerFn),
      {
        prefix: "public/reference-specifications/",
      }
    );

    documentInputBucket.addEventNotification(
      cdk.aws_s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
      new cdk.aws_s3_notifications.LambdaDestination(textractExtractHandlerFn),
      {
        prefix: "public/reference-specifications/",
      }
    );

    const textractSaveResultsHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "textractSaveResultsHandlerFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "save_results.py",
        entry: "../api/text-textract",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DDB_TABLE_NAME: referenceSpecificationsTable.tableName,
        },
      }
    );
    referenceSpecificationsTable.grantFullAccess(textractSaveResultsHandlerFn);
    textractSaveResultsHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "textract:StartDocumentTextDetection",
          "textract:StartDocumentAnalysis",
          "textract:GetDocumentTextDetection",
          "textract:GetDocumentAnalysis",
        ],

        resources: ["*"],
      })
    );

    textractSaveResultsHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
        ],

        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecificationsTable.tableName}`,
        ],
      })
    );

    textractSaveResultsHandlerFn.addEventSource(
      new eventsources.SnsEventSource(textractExtractSNSTopic)
    );

    textractSaveResultsHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:PutItem",
        ],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecificationsTable.tableName}`,
        ],
      })
    );

    const listSpecificationsHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "listSpecificationHandlerFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "list_specifications.py",
        entry: "../api/list-specification",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DDB_TABLE_NAME: referenceSpecificationsTable.tableName,
        },
      }
    );

    referenceSpecificationsTable.grantReadData(listSpecificationsHandlerFn);

    new ApiGatewayV2LambdaConstruct(
      this,
      props.resourcePrefix + "listSpecificationsApiGateway",
      {
        lambdaFn: listSpecificationsHandlerFn,
        routePath: "/api/assets/specifications",
        methods: [apigwv2.HttpMethod.GET],
        api: api.apiGatewayV2,
      }
    );

    const bedrockLayer = new LayerVersion(
      this,
      props.resourcePrefix + "bedrockLayer",
      {
        compatibleRuntimes: [Runtime.PYTHON_3_10],
        compatibleArchitectures: [Architecture.ARM_64],
        code: Code.fromAsset("../lambda-layer/python-bedrock-layer.zip"),
      }
    );

    const contentGenerationHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "contentGenerationHandlerFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/content-generation",
        timeout: cdk.Duration.minutes(15),
        memorySize: 3096,
        architecture: Architecture.ARM_64,
        layers: [bedrockLayer],
        environment: {
          DYNAMO_DB_TABLE_NAME: referenceSpecificationsTable.tableName,
          S3_INPUT_ASSETS_BUCKET_NAME: documentInputBucket.bucketName,
          S3_OUTPUT_ASSETS_BUCKET_NAME: imageOutputBucket.bucketName,
        },
      }
    );

    contentGenerationHandlerFn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: [
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "bedrock:InvokeModel",
          "s3:GetObject",
          "s3:PutObject",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "lambda:InvokeFunction",
        ],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecificationsTable.tableName}`,
          `arn:aws:bedrock:${awsRegion}::foundation-model/*`,
          `arn:aws:s3:::${documentInputBucket.bucketName}/*`,
          `arn:aws:s3:::${imageOutputBucket.bucketName}/*`,
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    contentGenerationHandlerFn.addPermission("PermissionForAnotherAccount", {
      principal: cognito.authenticatedRole,
      action: "lambda:InvokeFunctionUrl",
    });

    const contentGenerationLambdaUrl =
      contentGenerationHandlerFn.addFunctionUrl({
        authType: cdk.aws_lambda.FunctionUrlAuthType.AWS_IAM,
        cors: {
          allowedOrigins: ["*"],
          allowedMethods: [
            cdk.aws_lambda.HttpMethod.GET,
            cdk.aws_lambda.HttpMethod.POST,
          ],
          allowCredentials: false,
          maxAge: cdk.Duration.minutes(10),
          exposedHeaders: ["access-control-allow-origin"],
          allowedHeaders: [
            "authorization",
            "content-type",
            "origin",
            "x-amz-date",
            "x-api-key",
            "x-amz-security-token",
            "x-amz-user-agent",
          ],
        },
      });

    new AmplifyConfigLambdaConstruct(this, "AmplifyConfigFn", {
      api: api.apiGatewayV2,
      appClientId: cognito.webClientId,
      identityPoolId: cognito.identityPoolId,
      userPoolId: cognito.userPoolId,
      documentInputBucketName: documentInputBucket.bucketName,
      contentUrl: contentGenerationLambdaUrl.url,
      apiUrl: api.apiGatewayV2.apiEndpoint,
    });
  }
}
