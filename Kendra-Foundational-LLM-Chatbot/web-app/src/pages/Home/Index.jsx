/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import { AppLayout, SpaceBetween } from "@cloudscape-design/components";
import { Chat } from "./Chat";

function Home() {
  return (
    <AppLayout
      content={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "50px",
          }}
        >
          <SpaceBetween size="xxs">
            <Chat />
          </SpaceBetween>
        </div>
      }
      toolsHide={true}
      contentType="default"
      navigationHide="true"
    />
  );
}

export default Home;
