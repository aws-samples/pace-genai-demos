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

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { WebSocketIamAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as apigwv2_int from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
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
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { ApiGatewayV2LambdaConstruct } from "./constructs/apigatewayv2-lambda-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";
import { NagSuppressions } from "cdk-nag";
export interface AppStackProps extends cdk.StackProps {
  readonly ssmWafArnParameterName: string;
  readonly ssmWafArnParameterRegion: string;
}
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const webAppBuildPath = "../web-app/build";
    const awsAccountId = cdk.Stack.of(this).account;
    const awsRegion = cdk.Stack.of(this).region;

    const documentInputLibraryBucket = new s3.Bucket(
      this,
      "GuruPharmaAdEnvInputDocumentLibraryBucket",
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

    documentInputLibraryBucket.addCorsRule({
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

    new cdk.CfnOutput(this, "GuruPharmaAdEnvDocumentInputS3Bucket", {
      value: documentInputLibraryBucket.bucketName,
    });

    const cognito = new CognitoWebNativeConstruct(this, "Cognito", {
      documentInputLibraryBucketArn: documentInputLibraryBucket.bucketArn,
    });

    documentInputLibraryBucket.grantReadWrite(cognito.authenticatedRole);

    const cfWafWebAcl = new SsmParameterReaderConstruct(
      this,
      "SsmWafParameter",
      {
        ssmParameterName: props.ssmWafArnParameterName,
        ssmParameterRegion: props.ssmWafArnParameterRegion,
      }
    ).getValue();

    documentInputLibraryBucket.grantReadWrite(cognito.authenticatedRole);

    const website = new CloudFrontS3WebSiteConstruct(this, "WebApp", {
      webSiteBuildPath: webAppBuildPath,
      webAclArn: cfWafWebAcl,
    });

    const api = new ApiGatewayV2CloudFrontConstruct(this, "Api", {
      cloudFrontDistribution: website.cloudFrontDistribution,
      userPool: cognito.userPool,
      userPoolClient: cognito.webClientUserPool,
    });

    const imageOutputLibraryBucket = new s3.Bucket(
      this,
      "GuruPharmaAdEnvImageOutputLibraryBucket",
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

    const referenceSpecifications = new dynamodb.Table(
      this,
      "GuruPharmaAdEnvReferenceSpecificationsTable",
      {
        billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
        pointInTimeRecovery: true,
      }
    );

    const documentTableName = new ssm.StringParameter(
      this,
      "GuruPharmaAdEnvReferenceSpecificationsTableName",
      {
        parameterName: "/public/referenceSpecifications",
        stringValue: referenceSpecifications.tableName,
      }
    );

    const textractExtractTopicKey = new cdk.aws_kms.Key(
      this,
      `GuruPharmaAdEnvTextractExtractTopicKey`,
      { enableKeyRotation: true }
    );

    const textractExtractSNSTopic = new cdk.aws_sns.Topic(
      this,
      "GuruPharmaAdEnvTextractExtractSNSTopic",
      {
        topicName: `textractExtractSNSTopic-${cdk.Stack.of(this).stackName}`,
        masterKey: textractExtractTopicKey,
      }
    );

    const textractExtractTextractRole = new iam.Role(
      this,
      "GuruPharmaAdEnvTextractExtractTextractRole",
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

    const textractExtractFn = new lambdaPython.PythonFunction(
      this,
      "GuruPharmaAdEnvTextractExtractFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "trigger_extraction.py",
        entry: "../api/fn-textract",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DDB_TABLE_NAME: referenceSpecifications.tableName,
          SNS_TOPIC_ARN: textractExtractSNSTopic.topicArn,
          SNS_ROLE_ARN: textractExtractTextractRole.roleArn,
        },
      }
    );

    textractExtractFn.addToRolePolicy(
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

    textractExtractFn.addToRolePolicy(
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

    textractExtractFn.addToRolePolicy(
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
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecifications.tableName}`,
        ],
      })
    );

    documentInputLibraryBucket.grantRead(textractExtractFn);

    documentInputLibraryBucket.addEventNotification(
      cdk.aws_s3.EventType.OBJECT_CREATED_PUT,
      new cdk.aws_s3_notifications.LambdaDestination(textractExtractFn),
      {
        prefix: "public/reference-specifications/",
      }
    );

    documentInputLibraryBucket.addEventNotification(
      cdk.aws_s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
      new cdk.aws_s3_notifications.LambdaDestination(textractExtractFn),
      {
        prefix: "public/reference-specifications/",
      }
    );

    const textractSaveResultsFn = new lambdaPython.PythonFunction(
      this,
      "GuruPharmaAdEnvTextractSaveResultsFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "save_results.py",
        entry: "../api/fn-textract",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DDB_TABLE_NAME: referenceSpecifications.tableName,
        },
      }
    );
    referenceSpecifications.grantFullAccess(textractSaveResultsFn);
    textractSaveResultsFn.addToRolePolicy(
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

    textractSaveResultsFn.addToRolePolicy(
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
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecifications.tableName}`,
        ],
      })
    );

    textractSaveResultsFn.addEventSource(
      new eventsources.SnsEventSource(textractExtractSNSTopic)
    );

    textractSaveResultsFn.addToRolePolicy(
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
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecifications.tableName}`,
        ],
      })
    );

    const listSpecificationsFn = new lambdaPython.PythonFunction(
      this,
      "GuruPharmaAdEnvListSpecificationFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "list_specifications.py",
        entry: "../api/fn-list-specification",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DDB_TABLE_NAME: referenceSpecifications.tableName,
        },
      }
    );

    referenceSpecifications.grantReadData(listSpecificationsFn);

    new ApiGatewayV2LambdaConstruct(
      this,
      "GuruPharmaAdEnvListSpecificationsApiGateway",
      {
        lambdaFn: listSpecificationsFn,
        routePath: "/api/assets/specifications",
        methods: [apigwv2.HttpMethod.GET],
        api: api.apiGatewayV2,
      }
    );

    const modelLambdaFunctionHandlerRole = new cdk.aws_iam.Role(
      this,
      "GuruPharmaAdEnvModelLambdaFunctionHandlerRole",
      {
        description: "Role Model Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    modelLambdaFunctionHandlerRole.addToPolicy(
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
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecifications.tableName}`,
          `arn:aws:bedrock:${awsRegion}::foundation-model/*`,
          `arn:aws:s3:::${documentInputLibraryBucket.bucketName}/*`,
          `arn:aws:s3:::${imageOutputLibraryBucket.bucketName}/*`,
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    const bedrockLambdaLayer = new LayerVersion(this, "bedrockLayer", {
      compatibleRuntimes: [Runtime.PYTHON_3_10],
      compatibleArchitectures: [Architecture.ARM_64],
      code: Code.fromAsset("../lambda-layer/python-bedrock-layer.zip"),
    });

    const contentGenerationFn = new lambdaPython.PythonFunction(
      this,
      "GuruPharmaAdEnvContentGenerationFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/fn-content-generation",
        timeout: cdk.Duration.minutes(15),
        memorySize: 3096,
        role: modelLambdaFunctionHandlerRole,
        architecture: Architecture.ARM_64,
        layers: [bedrockLambdaLayer],
        environment: {
          DYNAMO_DB_TABLE_NAME: referenceSpecifications.tableName,
          S3_INPUT_ASSETS_BUCKET_NAME: documentInputLibraryBucket.bucketName,
          S3_OUTPUT_ASSETS_BUCKET_NAME: imageOutputLibraryBucket.bucketName,
        },
      }
    );

    contentGenerationFn.addPermission("PermissionForAnotherAccount", {
      principal: cognito.authenticatedRole,
      action: "lambda:InvokeFunctionUrl",
    });

    const contentGenerationLambdaUrl = contentGenerationFn.addFunctionUrl({
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

    new cdk.CfnOutput(this, "GuruPharmaAdEnvGenerationLambdaUrl", {
      description: "LambdaFn Url",
      value: contentGenerationLambdaUrl.url,
    });

    new AmplifyConfigLambdaConstruct(this, "AmplifyConfigFn", {
      api: api.apiGatewayV2,
      appClientId: cognito.webClientId,
      identityPoolId: cognito.identityPoolId,
      userPoolId: cognito.userPoolId,
    });
  }
}
