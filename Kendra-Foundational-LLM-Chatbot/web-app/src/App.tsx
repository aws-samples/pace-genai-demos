/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import React from "react";
import "@aws-amplify/ui-react/styles.css";
import { withAuthenticator } from "@aws-amplify/ui-react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import { TopBarNavigation } from "./components/TopBarNavigation";
import Index from "./pages/Home/Index";
import { Chat } from "./pages/Home/Chat";
import "./App.css";
import { OnboardDocs } from "./pages/Home/Onboard";

const Footer = () => (
  <footer className="footer">
    <img src="prototyping.png" alt="AWS" className="footer-logo" />
  </footer>
);

function App() {
  return (
    <React.Fragment>
      <TopBarNavigation />
      <BrowserRouter>
        <Switch>
          <Route path="/" exact={true} component={Chat} />
          <Route path="/newdoc" exact={true} component={OnboardDocs} />
        </Switch>
        <Footer></Footer>
      </BrowserRouter>
    </React.Fragment>
  );
}

const MyTheme = {
  hideSignUp: true,
};

export default withAuthenticator(App, MyTheme);
