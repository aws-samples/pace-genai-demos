// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR Anp
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

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as stepfunctionsTasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { aws_logs as logs } from "aws-cdk-lib";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { S3EventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import { Size } from "aws-cdk-lib/core";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";

export interface AppStackProps extends cdk.StackProps {
  readonly ssmWafArnParameterName: string;
  readonly ssmWafArnParameterRegion: string;
  readonly resourcePrefix: string; // Add this line
}

import { ApiGatewayV2LambdaConstruct } from "./constructs/apigatewayv2-lambda-construct";

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const webAppBuildPath = "../web-app/build";
    const awsAccountId = cdk.Stack.of(this).account;
    const awsRegion = cdk.Stack.of(this).region;

    const endpoint_name = "e5-largev2";
    const authentication = "False";

    const documentInputBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "documentInputBucket",
      {
        versioned: true,
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

    const documentOutputBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "documentOutputBucket",
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

    const defaultDocumentBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "defaultDocumentBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    const modelPackageBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "modelPackageBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    const temporaryDocumentBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "temporaryDocumentBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    const bedrockLangchainLayer = new LayerVersion(
      this,
      props.resourcePrefix + "bedrockLangchainLayer",
      {
        compatibleRuntimes: [Runtime.PYTHON_3_10],
        compatibleArchitectures: [Architecture.ARM_64],
        code: Code.fromAsset(
          "../lambda_langchain_layer/python-bedrock-langchain-layer.zip"
        ),
      }
    );

    const cognito = new CognitoWebNativeConstruct(this, "Cognito", {
      documentInputLibraryBucketArn: documentInputBucket.bucketArn,
    });

    const cfWafWebAcl = new SsmParameterReaderConstruct(
      this,
      "SsmWafParameter",
      {
        ssmParameterName: props.ssmWafArnParameterName,
        ssmParameterRegion: props.ssmWafArnParameterRegion,
      }
    ).getValue();

    const website = new CloudFrontS3WebSiteConstruct(this, "WebApp", {
      webSiteBuildPath: webAppBuildPath,
      webAclArn: cfWafWebAcl,
    });

    const api = new ApiGatewayV2CloudFrontConstruct(this, "Api", {
      cloudFrontDistribution: website.cloudFrontDistribution,
      userPool: cognito.userPool,
      userPoolClient: cognito.webClientUserPool,
    });

    const chatContextTable = new dynamodb.Table(
      this,
      props.resourcePrefix + "chatContextTable",
      {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
        sortKey: { name: "connection_id", type: dynamodb.AttributeType.STRING },
        pointInTimeRecovery: true,
      }
    );

    const documentTable = new dynamodb.Table(
      this,
      props.resourcePrefix + "documentTable",
      {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
        pointInTimeRecovery: true,
      }
    );

    const vpcFlowLogsBucket = new s3.Bucket(
      this,
      props.resourcePrefix + "vpcFlowLogsBucket",
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

    const vpc = new ec2.Vpc(this, props.resourcePrefix + "vPC", {
      maxAzs: 2,
    });

    vpc.addFlowLog(props.resourcePrefix + "-flowLogS3", {
      destination: ec2.FlowLogDestination.toS3(vpcFlowLogsBucket),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    new ec2.SecurityGroup(this, props.resourcePrefix + "securityGroup", {
      vpc,
      description: "Guru Embeddings Security Group ECS Task",
      allowAllOutbound: true,
    });

    const cluster = new ecs.Cluster(this, props.resourcePrefix + "ecsCluster", {
      vpc,
      containerInsights: true,
    });

    const taskExecutionRole = new iam.Role(
      this,
      props.resourcePrefix + "TaskExecutionRole",
      {
        assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      }
    );

    taskExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/ecs/*`,
        ],
      })
    );

    const taskRole = new iam.Role(this, props.resourcePrefix + "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:PutItem", "dynamodb:UpdateItem"],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${documentTable.tableName}`,
        ],
      })
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl",
          "s3:GetObjectVersion",
        ],
        resources: [
          `arn:aws:s3:::${documentOutputBucket.bucketName}/*`,
          `arn:aws:s3:::${temporaryDocumentBucket.bucketName}/*`,
        ],
      })
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [
          `arn:aws:sagemaker:${awsRegion}:${awsAccountId}:endpoint/*`,
        ],
      })
    );

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      props.resourcePrefix + "taskDefinition",
      {
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
        },
        cpu: 2048,
        memoryLimitMiB: 6144,
        executionRole: taskExecutionRole,
        taskRole: taskRole,
      }
    );

    const logging = new ecs.AwsLogDriver({
      streamPrefix: props.resourcePrefix + "ecsLogging",
    });

    const container = taskDefinition.addContainer(
      props.resourcePrefix + "container",
      {
        image: ecs.ContainerImage.fromAsset("../ecs_task_definition"),
        cpu: 1024,
        memoryLimitMiB: 4096,
        logging: logging,
      }
    );

    const listDocumentHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "listDocumentHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/list-document",
        retryAttempts: 0,
        timeout: cdk.Duration.minutes(3),
        memorySize: 2000,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          DOCUMENT_TABLE_NAME: documentTable.tableName,
        },
      }
    );

    listDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:Scan"],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${documentTable.tableName}`,
        ],
      })
    );

    listDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    new ApiGatewayV2LambdaConstruct(this, props.resourcePrefix + "apiGateway", {
      lambdaFn: listDocumentHandlerFn,
      routePath: "/api/document/list",
      methods: [apigwv2.HttpMethod.GET],
      api: api.apiGatewayV2,
    });

    const embeddingHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "embeddingHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/vectorization",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 2048,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          CLUSTER_NAME: cluster.clusterName,
          TASK_DEFINITION: taskDefinition.taskDefinitionArn,
          SUBNET_1: vpc.publicSubnets[0].subnetId,
          SUBNET_2: vpc.publicSubnets[1].subnetId,
          INPUT_BUCKET_NAME: documentInputBucket.bucketName,
          OUTPUT_BUCKET_NAME: documentOutputBucket.bucketName,
          CONTAINER_NAME: container.containerName,
        },
      }
    );

    embeddingHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ecs:RunTask"],
        resources: [taskDefinition.taskDefinitionArn],
      })
    );
    embeddingHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole", "sts:AssumeRole"],
        resources: [taskExecutionRole.roleArn, taskDefinition.taskRole.roleArn],
      })
    );

    embeddingHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    const textractDocumentHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "textractDocumentHandlerFn",
      {
        runtime: Runtime.PYTHON_3_10,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/text-extraction",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 3096,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          DOCUMENT_TABLE_NAME: documentTable.tableName,
          TEMPORARY_BUCKET_NAME: temporaryDocumentBucket.bucketName,
          EMBEDDINGS_ENDPOINT_NAME: endpoint_name,
          OUTPUT_BUCKET_NAME: documentOutputBucket.bucketDomainName,
        },
      }
    );

    textractDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        resources: [
          `arn:aws:s3:::${documentInputBucket.bucketName}/*`,
          `arn:aws:s3:::${temporaryDocumentBucket.bucketName}/*`,
        ],
      })
    );

    textractDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    textractDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:PutItem", "dynamodb:UpdateItem"],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${documentTable.tableName}`,
        ],
      })
    );

    textractDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "textract:StartDocumentTextDetection",
          "textract:DetectDocumentText",
          "textract:GetDocumentTextDetection",
          "textract:AnalyzeDocument",
        ],
        resources: ["*"],
      })
    );

    const errorCatchHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "errorCatchHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/error-handler",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          DOCUMENT_TABLE_NAME: documentTable.tableName,
        },
      }
    );

    errorCatchHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:UpdateItem"],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${documentTable.tableName}`,
        ],
      })
    );

    errorCatchHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    const checkCompletionHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "checkEcsCompletionHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/check-status",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          ECS_CLUSTER_NAME: cluster.clusterName,
          CLUSTER_NAME: cluster.clusterName,
          TASK_DEFINITION: taskDefinition.taskDefinitionArn,
          SUBNET_1: vpc.publicSubnets[0].subnetId,
          SUBNET_2: vpc.publicSubnets[1].subnetId,
          INPUT_BUCKET_NAME: documentInputBucket.bucketName,
          OUTPUT_BUCKET_NAME: documentOutputBucket.bucketDomainName,
        },
      }
    );

    checkCompletionHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ecs:DescribeTasks"],
        resources: [
          `arn:aws:ecs:${awsRegion}:${awsAccountId}:task/${cluster.clusterName}/*`,
        ],
      })
    );

    const textractTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Document Extraction",
      {
        lambdaFunction: textractDocumentHandlerFn,
        outputPath: "$.Payload",
      }
    );

    const embeddingTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Text Embedding",
      {
        lambdaFunction: embeddingHandlerFn,
        outputPath: "$.Payload",
      }
    );

    const wait30Seconds = new stepfunctions.Wait(this, "Wait 30 Seconds", {
      time: stepfunctions.WaitTime.duration(cdk.Duration.seconds(30)),
    });

    const checkEcsCompletionTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Is Ecs Task Complete?",
      {
        lambdaFunction: checkCompletionHandlerFn,
        outputPath: "$.Payload",
      }
    );

    const errorState = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Catching an Error",
      {
        lambdaFunction: errorCatchHandlerFn,
        payload: stepfunctions.TaskInput.fromObject({
          entirePayload: stepfunctions.JsonPath.entirePayload,
        }),
        outputPath: "$.Payload",
      }
    );

    const endState = new stepfunctions.Pass(this, "End State", {
      result: {
        value: "ECS task completed successfully.",
      },
    });

    const isDoneChoice = new stepfunctions.Choice(this, "Is Ecs Task Done?");
    isDoneChoice.when(
      stepfunctions.Condition.booleanEquals("$.done", true),
      endState
    );
    isDoneChoice.otherwise(wait30Seconds);

    wait30Seconds.next(checkEcsCompletionTask);
    checkEcsCompletionTask.next(isDoneChoice);

    textractTask.addCatch(errorState, {
      resultPath: "$.errorInfo",
    });
    embeddingTask.addCatch(errorState, {
      resultPath: "$.errorInfo",
    });

    const definition = textractTask.next(embeddingTask).next(wait30Seconds);

    const logPipelineGroup = new logs.LogGroup(
      this,
      props.resourcePrefix + "stateMachineLogGroup"
    );

    const documentEmbeddingsPipeline = new stepfunctions.StateMachine(
      this,
      props.resourcePrefix + "documentEmbeddingsPipeline",
      {
        definition,
        timeout: cdk.Duration.minutes(60),
        tracingEnabled: true,
        logs: {
          destination: logPipelineGroup,
          level: stepfunctions.LogLevel.ALL,
        },
      }
    );

    const s3TriggerPipelineHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "s3TriggerPipelineHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/trigger-pipeline",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          STATE_MACHINE_ARN: documentEmbeddingsPipeline.stateMachineArn,
        },
      }
    );

    s3TriggerPipelineHandlerFn.addEventSource(
      new S3EventSource(documentInputBucket, {
        events: [
          s3.EventType.OBJECT_CREATED_PUT,
          s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
        ],
      })
    );

    s3TriggerPipelineHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["states:StartExecution"],
        resources: [
          `arn:aws:states:${awsRegion}:${awsAccountId}:stateMachine:${documentEmbeddingsPipeline.stateMachineName}`,
        ],
      })
    );

    s3TriggerPipelineHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [`arn:aws:s3:::${documentInputBucket.bucketName}/*`],
      })
    );

    const sagemakerPrincipalRole = new cdk.aws_iam.Role(
      this,
      props.resourcePrefix + "sageMakerEmbeddingsRole",
      {
        description: "Role SageMaker Embeddings",
        assumedBy: new cdk.aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
      }
    );

    sagemakerPrincipalRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sagemaker:CreateModel", "sagemaker:DeleteModel"],
        resources: [`arn:aws:sagemaker:${awsRegion}:${awsAccountId}:model/*`],
      })
    );

    sagemakerPrincipalRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          "sagemaker:CreateEndpoint",
          "sagemaker:DeleteEndpoint",
          "sagemaker:DescribeEndpoint",
          "sagemaker:UpdateEndpoint",
        ],
        resources: [
          `arn:aws:sagemaker:${awsRegion}:${awsAccountId}:endpoint/*`,
        ],
      })
    );

    sagemakerPrincipalRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          "ecr:ListTagsForResource",
          "ecr:ListImages",
          "ecr:DescribeRepositories",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetLifecyclePolicyPreview",
          "ecr:DescribeImageScanFindings",
          "ecr:GetLifecyclePolicy",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
          "ecr:GetAuthorizationToken",
          "ecr:GetRegistryPolicy",
        ],
        resources: ["*"],
      })
    );

    sagemakerPrincipalRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/sagemaker/*`,
        ],
      })
    );

    sagemakerPrincipalRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:ListBucket", "s3:CreateBucket"],
        resources: [
          `arn:aws:s3:::${modelPackageBucket.bucketName}`,
          `arn:aws:s3:::sagemaker-${awsRegion}-${awsAccountId}`,
        ],
      })
    );

    sagemakerPrincipalRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl",
          "s3:GetObjectVersion",
        ],
        resources: [
          `arn:aws:s3:::${modelPackageBucket.bucketName}/*`,
          `arn:aws:s3:::sagemaker-${awsRegion}-${awsAccountId}/*`,
        ],
      })
    );

    sagemakerPrincipalRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "sagemaker:CreateEndpointConfig",
          "sagemaker:DeleteEndpointConfig",
          "sagemaker:DescribeEndpointConfig",
        ],
        resources: [
          `arn:aws:sagemaker:${awsRegion}:${awsAccountId}:endpoint-config/${endpoint_name}`,
        ],
      })
    );

    sagemakerPrincipalRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole", "sts:AssumeRole"],
        resources: [sagemakerPrincipalRole.roleArn],
      })
    );

    const modelHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "modelHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/embeddings-handler",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 4000,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          EMBEDDING_MODEL_BUCKET_NAME: modelPackageBucket.bucketName,
          SAGEMAKER_EXECUTION_ROLE: sagemakerPrincipalRole.roleArn,
        },
      }
    );

    new s3Deployment.BucketDeployment(
      this,
      props.resourcePrefix + "modelDeployment",
      {
        sources: [s3Deployment.Source.asset("../embeddings_model_file")],
        destinationBucket: modelPackageBucket,
        prune: false,
        memoryLimit: 10000,
        ephemeralStorageSize: Size.gibibytes(10),
      }
    );

    modelHandlerFn.addEventSource(
      new S3EventSource(modelPackageBucket, {
        events: [
          s3.EventType.OBJECT_CREATED_PUT,
          s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
        ],
      })
    );

    modelHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    modelHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sagemaker:CreateModel"],
        resources: [`arn:aws:sagemaker:${awsRegion}:${awsAccountId}:model/*`],
      })
    );

    modelHandlerFn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          "sagemaker:CreateEndpoint",
          "sagemaker:DeleteEndpoint",
          "sagemaker:DescribeEndpoint",
          "sagemaker:UpdateEndpoint",
          "sagemaker:CreateEndpointConfig",
          "sagemaker:DeleteEndpointConfig",
          "sagemaker:DescribeEndpointConfig",
        ],
        resources: [
          `arn:aws:sagemaker:${awsRegion}:${awsAccountId}:endpoint/*`,
          `arn:aws:sagemaker:${awsRegion}:${awsAccountId}:endpoint-config/${endpoint_name}`,
        ],
      })
    );

    modelHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:ListBucket", "s3:CreateBucket"],
        resources: [
          `arn:aws:s3:::${modelPackageBucket.bucketName}`,
          `arn:aws:s3:::sagemaker-${awsRegion}-${awsAccountId}`,
        ],
      })
    );

    modelHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl",
          "s3:GetObjectVersion",
        ],
        resources: [
          `arn:aws:s3:::${modelPackageBucket.bucketName}/*`,
          `arn:aws:s3:::sagemaker-${awsRegion}-${awsAccountId}/*`,
        ],
      })
    );

    modelHandlerFn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ["iam:PassRole", "sts:AssumeRole"],
        resources: [sagemakerPrincipalRole.roleArn],
      })
    );

    const insertDocumentHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "insertDocumentHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/insert-document",
        timeout: cdk.Duration.minutes(3),
        retryAttempts: 0,
        memorySize: 2048,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          DOCUMENT_TABLE_NAME: documentTable.tableName,
          OUTPUT_BUCKET_NAME: documentOutputBucket.bucketName,
        },
      }
    );

    new s3Deployment.BucketDeployment(
      this,
      props.resourcePrefix + "documentDeployment",
      {
        sources: [s3Deployment.Source.asset("../default_documents")],
        destinationBucket: defaultDocumentBucket,
        prune: false,
        memoryLimit: 5000,
        ephemeralStorageSize: Size.gibibytes(4),
      }
    );

    insertDocumentHandlerFn.addEventSource(
      new S3EventSource(defaultDocumentBucket, {
        events: [
          s3.EventType.OBJECT_CREATED_PUT,
          s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
        ],
      })
    );

    insertDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    insertDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:PutObject",
          "s3:ReplicateObject",
        ],
        resources: [
          `arn:aws:s3:::${documentOutputBucket.bucketName}/*`,
          `arn:aws:s3:::${defaultDocumentBucket.bucketName}/*`,
        ],
      })
    );

    insertDocumentHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:PutItem"],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${documentTable.tableName}`,
        ],
      })
    );

    const chatHandlerFn = new lambdaPython.PythonFunction(
      this,
      props.resourcePrefix + "chatHandlerFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/chat-handler",
        timeout: cdk.Duration.minutes(15),
        memorySize: 4096,
        architecture: Architecture.ARM_64,
        layers: [bedrockLangchainLayer],
        environment: {
          CONTEXT_TABLE_NAME: chatContextTable.tableName,
          S3_ASSETS_BUCKET_NAME: documentOutputBucket.bucketName,
          EMBEDDINGS_SAGEMAKER_ENDPOINT: endpoint_name,
          AWS_INTERNAL: authentication,
        },
      }
    );

    chatHandlerFn.addPermission(
      props.resourcePrefix + "chatHandlerPermission",
      {
        principal: cognito.authenticatedRole,
        action: "lambda:InvokeFunctionUrl",
      }
    );

    const chatHandlerUrl = chatHandlerFn.addFunctionUrl({
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

    chatHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/lambda/*`,
        ],
      })
    );

    chatHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [
          `arn:aws:sagemaker:${awsRegion}:${awsAccountId}:endpoint/*`,
        ],
      })
    );

    chatHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      })
    );

    chatHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl",
          "s3:GetObjectVersion",
        ],
        resources: [`arn:aws:s3:::${documentOutputBucket.bucketName}/*`],
      })
    );

    chatHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
          "dynamodb:GetItem",
        ],
        resources: [
          `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${chatContextTable.tableName}`,
        ],
      })
    );

    new AmplifyConfigLambdaConstruct(this, "AmplifyConfigFn", {
      api: api.apiGatewayV2,
      appClientId: cognito.webClientId,
      identityPoolId: cognito.identityPoolId,
      userPoolId: cognito.userPoolId,
      documentInputBucketName: documentInputBucket.bucketName,
      chatHandlerUrl: chatHandlerUrl.url,
      apiUrl: api.apiGatewayV2.apiEndpoint,
    });
  }
}
