/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import { useState, useEffect } from "react";
import TopNav from "@cloudscape-design/components/top-navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { Auth } from "aws-amplify";
import { useHistory } from "react-router-dom";

import {
  resetChat,
  resetDocument,
  resetModel,
  sendValueOne,
  setCallbackOne,
} from "../pages/Home/chatUtils";



const i18nStrings = {};

const APP_TITLE = process.env.REACT_APP_CUSTOMER_NAME || "Guru";
const CUSTOMER_LOGO =
  process.env.REACT_APP_CUSTOMER_LOGO !==
  "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
    ? process.env.REACT_APP_CUSTOMER_LOGO
    : "data:image/png;base64,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";

export function TopBarNavigation() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState("");
  const [selectedModel, setSelectedModel] = useState("Anthropic Claude V2");

  const setDarkLightTheme = () => {
    if (darkMode) {
      localStorage.setItem("darkMode", false);
      applyMode(Mode.Light);
      setDarkMode(false);
    } else {
      localStorage.setItem("darkMode", true);
      applyMode(Mode.Dark);
      setDarkMode(true);
    }
  };

  function handleResetChat() {
    resetChat();
  }

  function handleResetDocument() {
    resetDocument();
  }

  async function signOut() {
    try {
      await Auth.signOut();
    } catch (error) {
      console.log("error signing out: ", error);
    }
  }

  async function onItemClickEvent(event) {
    if (event.detail.id === "signout") {
      try {
        await Auth.signOut();
      } catch (error) {
        console.log("error signing out: ", error);
      }
    }
  }
  const onItemClickEventReset = () => {
    if (window.location.href.includes("newdoc"))
      window.location.href = "/";
    else
      handleResetChat();
  };

  const onItemClickEventModel = (event) => {
    const selectedItemId = event.detail.id;
    sendValueOne(selectedItemId);
    setSelectedModel(selectedItemId);
    resetModel();
    resetChat();

    setCallbackOne((value) => {
      console.log("");
    });
  };

  async function getUser() {
    try {
      let currentUser = await Auth.currentUserInfo();
      if (currentUser["attributes"]["email"] === undefined) {
        setUser(currentUser["username"]);
      } else {
        setUser(currentUser["attributes"]["email"]);
      }
    } catch (error) {
      console.log("error getting current user: ", error);
    }
  }

  useEffect(() => {
    console.log(window.location);
    setDarkMode(document.body.className === "awsui-dark-mode");
    const darkModePreference = localStorage.getItem("darkMode");
    if (darkModePreference === "true") {
      applyMode(Mode.Dark);
      setDarkMode(true);
    } else {
      applyMode(Mode.Light);
      setDarkMode(false);
    }

    getUser();
  }, []);

  return (
    <TopNav
      className="top-nav"
      i18nStrings={i18nStrings}
      identity={{
        href: "/",
        title: APP_TITLE,
        logo: {
          src: CUSTOMER_LOGO,
          alt: APP_TITLE,
        },
      }}
      utilities={[
        {
          type: "button",
          variant: "primary",
          iconName: "contact",
          text: "   New Chat",
          title: "   New Chat",
          onClick: () => onItemClickEventReset(),
        },
        {
          type: "button",
          variant: "primary",
          iconName: "upload",
          text: "   Add new documents",
          title: "   Add new documents",
          href: "/newdoc",
        },
        {
          type: "menu-dropdown",
          text: selectedModel,
          iconName: "script",
          onItemClick: (e) => onItemClickEventModel(e),
          items: [
           {
              id: "AI21 Jurassic-2 Ultra",
              text: "AI21 Jurassic-2 Ultra"
                
            },
            {
              id: "Anthropic Claude V2",
              text: "Anthropic Claude V2"
            },
            {
              id: "Amazon Titan Large",
              text: "Amazon Titan Large"
            },
            {
              id: "Anthropic Claude V3 Sonnet",
              text: "Anthropic Claude V3 Sonnet"
            },
            {
              id: "Anthropic Claude V3 Haiku",
              text: "Anthropic Claude V3 Haiku"
            },
            {
              id: "Anthropic Claude V3 Opus",
              text: "Anthropic Claude V3 Opus (Coming Soon)"
            }
          ].filter((item) => item.id !== selectedModel),
        },
        {
          type: "menu-dropdown",
          text: user,
          description: user,
          iconName: "user-profile",
          onItemClick: (e) => onItemClickEvent(e),
          items: [
            {
              id: "signout",
              type: "button",
              variant: "primary",
              iconName: "unlocked",
              text: "Sign Out",
              title: "Sign Out",
            },
          ],
        },
      ]}
    />
  );
}

