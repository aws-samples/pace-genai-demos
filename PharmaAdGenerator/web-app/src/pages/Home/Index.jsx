// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { AppLayout, SpaceBetween } from "@cloudscape-design/components";
import { HomeView } from "./Home";

function Homepage() {
    return (
        <AppLayout
            content={<HomeView />}
            toolsHide={true}
            contentType="default"
            navigationHide="true"
        />
    );
}

export default Homepage;
