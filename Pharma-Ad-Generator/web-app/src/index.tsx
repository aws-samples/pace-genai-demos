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
// --  Purpose:       Main Index
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import { Amplify, Auth } from "aws-amplify";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import reportWebVitals from "./reportWebVitals";

let basePath: string;
if (process.env.NODE_ENV === "production") {
  basePath = `${window.location.origin}/`;
} else {
  basePath = process.env.REACT_APP_API_URL || "";
}

fetch(`${basePath}/api/amplify-config`).then(async (response) => {
  const amplifyConfig = await response.json();
  Amplify.configure({
    Auth: {
      mandatorySignIn: true,
      region: amplifyConfig.region,
      userPoolId: amplifyConfig.userPoolId,
      identityPoolId: amplifyConfig.identityPoolId,
      userPoolWebClientId: amplifyConfig.appClientId,
    },
    API: {
      endpoints: [
        {
          name: "api",
          endpoint: amplifyConfig.apiUrl,
          region: amplifyConfig.region,
          custom_header: async () => {
            return {
              Authorization: `Bearer ${(await Auth.currentSession())
                .getIdToken()
                .getJwtToken()}`,
            };
          },
        },
        {
          name: "generateContentAPI",
          endpoint: amplifyConfig.contentUrl,
          service: "lambda",
          region: amplifyConfig.region,
        },
      ],
    },
    Storage: {
      AWSS3: {
        bucket: amplifyConfig.documentInputBucketName,
        region: amplifyConfig.region,
      },
    },
  });

  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById("root")
  );
  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
});
