// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Upload } from "./Upload";
import { AppLayout, SpaceBetween } from "@cloudscape-design/components";

function IndexUpload() {
    return (
        <AppLayout
            content={<Upload />}
            toolsHide={true}
            contentType="default"
            navigationHide="true"
        />
    );
}

export default IndexUpload;
