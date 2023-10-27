// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { createMuiTheme } from "@material-ui/core/styles";

//@link https://cimdalli.github.io/mui-theme-generator/
//@todo set overrides for all core components,
// need to make sure imported components implement theming

const theme = createMuiTheme({
    palette: {
        type: "dark",
        primary: {
            main: "#0870d8",
            contrastText: "rgba(255, 255, 255, .78)",
        },
        secondary: {
            main: "#00b5e2",
            contrastText: "rgba(0, 0, 0, .27)",
        },
        background: {
            default: "rgba(255,255,255,0)",
        },
        divider: "rgba(255,255,255,.3)",
    },
    typography: {
        fontFamily: "Arial",
        htmlFontSize: 16,
        h1: {
            fontFamily: "Arial",
            fontWeight: 700,
        },
        h2: {
            fontFamily: "Arial",
            fontWeight: 700,
        },
        h3: {
            fontFamily: "Arial",
            fontWeight: 700,
        },
        h4: {
            fontFamily: "Arial",
            fontWeight: 700,
        },
        h5: {
            fontFamily: "Arial",
            fontWeight: 700,
        },
        h6: {
            fontFamily: "Arial",
            fontWeight: 700,
        },
    },
    shape: {
        borderRadius: 0,
    },
});

export { theme };
