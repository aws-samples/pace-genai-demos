/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as kendra from 'aws-cdk-lib/aws-kendra';
import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';

export interface KendraConstructProps {

    // Name of the Kendra Index
    readonly IndexName: string;

    // Kendra Edition
    readonly Edition: string;

    // S3 Bucket which contains Documents to be Ingested
    readonly kendraDataSyncInputBucketName: string,

    readonly CognitoUserPoolId: string,
}

export class KendraConstruct extends Construct {
    private props: KendraConstructProps
    private kendraIndex: kendra.CfnIndex
    private kendraDataSource: kendra.CfnDataSource
    
    
    constructor(parent: Construct, name: string, props: KendraConstructProps) {
        super(parent, name);
        this.props = props;
        const awsAccountId = cdk.Stack.of(this).account;
        const awsRegion = cdk.Stack.of(this).region;

        const indexRole = new cdk.aws_iam.Role(
            this,
            "kendraIndexRole",
            {
              description: "Role that Kendra uses to push logging and metrics to Amazon Cloudwatch",
              assumedBy: new cdk.aws_iam.ServicePrincipal("kendra.amazonaws.com"),
            }
        );

        indexRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
              actions: ["cloudwatch:PutMetricData"],
              resources: ['*'],
              conditions: {
                "StringEquals": {
                    "cloudwatch:namespace": "Kendra"
                }
              }
            })
        );

        indexRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
              actions: ["logs:DescribeLogGroups"],
              resources: ['*']
            })
        );
        indexRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
              actions: ["logs:CreateLogGroup"],
              resources: [`arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/kendra/*`]
            })
        );
        indexRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
              actions: [
                "logs:DescribeLogStreams",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
              ],
              resources: [`arn:aws:logs:${awsRegion}:${awsAccountId}:log-group:/aws/kendra/*:log-stream:*`]
            })
        );

        const cfnIndex = new kendra.CfnIndex(this, 'llmdemoIndex', {
            edition: props.Edition,
            name: props.IndexName,
            roleArn: indexRole.roleArn,
            userContextPolicy: "USER_TOKEN",
            userTokenConfigurations: [{
              jwtTokenTypeConfiguration: {
                keyLocation: "URL",
                url: `https://cognito-idp.${awsRegion}.amazonaws.com/${props.CognitoUserPoolId}/.well-known/jwks.json`,
                groupAttributeField: 'cognito:groups',
                userNameAttributeField: 'cognito:username',
              },
            }],
        });
        this.kendraIndex = cfnIndex

        ////////////////// Kendra //////////////////////////////////////

        
        const kendraS3AccessRole = new cdk.aws_iam.Role(
            this,
            "kendraS3AccessRole",
            {
              description: "Role that Kendra uses to access documents in S3 bucket",
              assumedBy: new cdk.aws_iam.ServicePrincipal("kendra.amazonaws.com"),
            }
        );
        kendraS3AccessRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
              actions: ["s3:GetObject"],
              resources: [`arn:aws:s3:::${props.kendraDataSyncInputBucketName}/*`]
            })
        );
        kendraS3AccessRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
              actions: ["s3:ListBucket"],
              resources: [`arn:aws:s3:::${props.kendraDataSyncInputBucketName}`]
            })
        );
        kendraS3AccessRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
              actions: [
                "kendra:BatchPutDocument",
                "kendra:BatchDeleteDocument"
              ],
              resources: [`arn:aws:kendra:${awsRegion}:${awsAccountId}:index/${cfnIndex.attrId}`]
            })
        );


        this.kendraDataSource = new kendra.CfnDataSource(this, 'llmdemoIndexDataSource', {
            indexId: cfnIndex.attrId,
            name: 'llmdemoIndexDataSource',
            type: 'S3',
            roleArn: kendraS3AccessRole.roleArn,
            dataSourceConfiguration: {
                s3Configuration: {
                    bucketName: props.kendraDataSyncInputBucketName,
                    accessControlListConfiguration: {
                      keyPath: `s3://${props.kendraDataSyncInputBucketName}/kendra_acl.json`
                    }
                }
            }
        })
    }

    
    public get KendraIndexId() : string {
        return this.kendraIndex.attrId
    }

    public get KendraDataSourceIndexId() : string {
      return this.kendraDataSource.attrId
  }
    
}