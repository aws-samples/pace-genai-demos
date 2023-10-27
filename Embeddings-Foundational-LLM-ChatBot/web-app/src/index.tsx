// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Amplify, Auth } from "aws-amplify";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./index.css";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/core/styles";
import { theme } from "./theme";

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
                    endpoint: basePath,
                    region: amplifyConfig.region,
                    custom_header: async () => {
                        return {
                            Authorization: `Bearer ${(await Auth.currentSession())
                                .getIdToken()
                                .getJwtToken()}`,
                        };
                    },
                },
            ],
        },
        Storage: {
            AWSS3: {
                bucket: process.env.REACT_APP_UPLOAD_S3_BUCKET,
                region: amplifyConfig.region,
            },
        },
    });

    ReactDOM.render(
        <React.StrictMode>
            <CssBaseline />
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </React.StrictMode>,
        document.getElementById("root"),
    );
    // If you want to start measuring performance in your app, pass a function
    // to log results (for example: reportWebVitals(console.log))
    // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
    reportWebVitals();
});
