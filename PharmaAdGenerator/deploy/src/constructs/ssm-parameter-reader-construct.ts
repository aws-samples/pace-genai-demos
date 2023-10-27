// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface SsmParameterReaderConstructProps extends cdk.StackProps {
    readonly ssmParameterName: string;
    readonly ssmParameterRegion: string;
    /**
     * Sets the physical resource id to current date to force a pull of the parameter on subsequent
     * deploys
     *
     * @default false
     */
    readonly pullEveryTime?: boolean;
}

const defaultProps: Partial<SsmParameterReaderConstructProps> = {
    pullEveryTime: false,
};

/**
 * Deploys the SsmParameterReaderConstruct construct
 *
 * Reads a inter / intra region parameter by name.
 *
 */
export class SsmParameterReaderConstruct extends Construct {
    public ssmParameter: cdk.custom_resources.AwsCustomResource;

    constructor(parent: Construct, name: string, props: SsmParameterReaderConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };

        const stack = cdk.Stack.of(this);

        const physicalResourceId = props.pullEveryTime
            ? Date.UTC.toString()
            : `${props.ssmParameterName}-${props.ssmParameterRegion}`;

        this.ssmParameter = new cdk.custom_resources.AwsCustomResource(this, "Param", {
            onUpdate: {
                service: "SSM",
                action: "getParameter",
                parameters: { Name: `${props.ssmParameterName}` },
                region: props.ssmParameterRegion,
                physicalResourceId: cdk.custom_resources.PhysicalResourceId.of(physicalResourceId),
            },
            policy: cdk.custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [
                    `arn:aws:ssm:${props.ssmParameterRegion}:${stack.account}:parameter/${props.ssmParameterName}`,
                ],
            }),
        });
    }

    /**
     * @returns string value of the parameter
     */
    public getValue() {
        return this.ssmParameter.getResponseField("Parameter.Value");
    }
}
