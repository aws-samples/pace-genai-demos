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
// --  Purpose:       Top Navigation Component
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import TopNav from "@cloudscape-design/components/top-navigation";
import { Mode, applyMode } from "@cloudscape-design/global-styles";
import { Auth } from "aws-amplify";
import { useEffect, useState } from "react";

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

  return (
    <TopNav
      i18nStrings={i18nStrings}
      identity={{
        href: "/",
        title: "Guru Pharma",
        logo: {
          src: "guru_pharma.svg",
          alt: "Guru Pharma",
        },
      }}
      utilities={[
        {
          type: "button",
          variant: "primary",
          text: "   Upload Document",
          title: "   Upload Document",
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/e/e6/Upload.svg",
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
