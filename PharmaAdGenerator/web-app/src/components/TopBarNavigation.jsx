// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from "react";
import TopNav from "@cloudscape-design/components/top-navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { Auth } from "aws-amplify";
import { API, Storage } from "aws-amplify";
import * as React from "react";

const i18nStrings = {};

export function TopBarNavigation() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

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

  let labels = null;

  return (
    <TopNav
      className="top-nav"
      i18nStrings={i18nStrings}
      identity={{
        href: "/",
        title: "Guru Pharma",
        logo: {
          src: "Guru_Pharma.svg",
          alt: "Guru Pharma",
        },
      }}
      utilities={[
        {
          type: "button",
          variant: "primary",
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/e/e6/Upload.svg",
          text: "   Upload Document",
          title: "   Upload Document",
          href: "/upload",
        },

        {
          type: "button",
          variant: "primary",
          onClick: () => setDarkLightTheme(),
          iconUrl: darkMode
            ? "https://upload.wikimedia.org/wikipedia/commons/0/08/Weather_icon_-_sunny.svg"
            : "https://upload.wikimedia.org/wikipedia/commons/7/72/Gnome-weather-clear-night.svg",
          text: darkMode ? "   Light Mode" : "   Dark Mode",
          title: darkMode ? "   Light Mode" : "   Dark Mode",
        },

        {
          type: "menu-dropdown",
          text: user,
          description: user,
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/c/ce/User-info.svg",
          onItemClick: (e) => onItemClickEvent(e),
          items: [
            {
              id: "signout",
              type: "button",
              variant: "primary",
              iconUrl:
                "https://upload.wikimedia.org/wikipedia/en/8/8c/Shutdown_button.svg",
              text: "Sign Out",
              title: "Sign Out",
            },
          ],
        },
      ]}
    />
  );
}
