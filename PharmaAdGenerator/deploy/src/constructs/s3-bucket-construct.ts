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
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface S3BucketConstructProps extends cdk.StackProps {
    /**
     * The Cognito UserPool to use for the default authorizer
     */
    readonly enforceSSL: boolean;
    /**
     * The Cognito UserPoolClient to use for the default authorizer
     */
    readonly removalPolicy: cdk.RemovalPolicy;
    /**
     * The CloudFront Distribution to attach the `/api/*` behavior
     */
    readonly blockPublicAccess: s3.BlockPublicAccess;

    readonly encryption: s3.BucketEncryption;

    readonly serverAccessLogsPrefix: string;

    readonly addEventNotification: boolean;

    readonly lambdaFn?: cdk.aws_lambda.Function;

    readonly sqs?: cdk.aws_sqs.Queue;

    readonly thisBucket?: boolean;

    readonly versioned: boolean;

    readonly cfnOutputName: string;

    readonly deleteObjects: boolean;

    readonly objectLockEnabled: boolean;
}

const defaultProps: Partial<S3BucketConstructProps> = {};

/**
 * Deploys Cognito with an Authenticated & UnAuthenticated Role with a Web and Native client
 */
export class S3BucketConstruct extends Construct {
    public userPool: cdk.aws_cognito.UserPool;
    public webClientUserPool: cdk.aws_cognito.UserPoolClient;
    public nativeClientUserPool: cdk.aws_cognito.UserPoolClient;
    public userPoolId: string;
    public identityPoolId: string;
    public webClientId: string;
    public nativeClientId: string;
    public authenticatedRole: cdk.aws_iam.Role;
    public unauthenticatedRole: cdk.aws_iam.Role;
    public bucket: s3.Bucket;
    public bucketName: string;

    constructor(parent: Construct, name: string, props: S3BucketConstructProps) {
        super(parent, name);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        props = { ...defaultProps, ...props };

        const bucket = new s3.Bucket(this, "Bucket", {
            enforceSSL: props.enforceSSL,
            removalPolicy: props.removalPolicy,
            blockPublicAccess: props.blockPublicAccess,
            encryption: props.encryption,
            serverAccessLogsPrefix: props.serverAccessLogsPrefix,
            versioned: props.versioned,
            autoDeleteObjects: props.deleteObjects,
            objectLockEnabled: props.objectLockEnabled,
        });

        // Add event notification
        if (props.addEventNotification) {
            if (props.lambdaFn !== undefined) {
                bucket.addEventNotification(
                    s3.EventType.OBJECT_CREATED,
                    new s3n.LambdaDestination(props.lambdaFn),
                );
            } else if (props.sqs !== undefined && s3n.SqsDestination) {
                bucket.addEventNotification(
                    s3.EventType.OBJECT_CREATED,
                    new s3n.SqsDestination(props.sqs),
                );
            } else if (props.sqs !== undefined && props.thisBucket) {
                bucket.addEventNotification(
                    s3.EventType.OBJECT_CREATED,
                    new s3n.SqsDestination(props.sqs),
                );
            }
        }

        // Assign Cfn Outputs
        new cdk.CfnOutput(this, props.cfnOutputName, {
            value: bucket.bucketArn,
        });

        // assign public properties
        this.bucketName = bucket.bucketName;
        this.bucket = bucket;
    }
}
