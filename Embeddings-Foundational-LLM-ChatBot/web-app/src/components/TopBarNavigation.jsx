// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR Anp
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

import { useState, useEffect } from "react";
import TopNav from "@cloudscape-design/components/top-navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import {
  resetChat,
  resetDocument,
  resetModel,
  sendValue,
  setCallback,
  sendValueOne,
  setCallbackOne,
} from "../pages/chatUtils";
import { API, Auth } from "aws-amplify";
import * as React from "react";

const i18nStrings = {};

export function TopBarNavigation() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(
    "Amazon-Report-vectorstore"
  );

  const [selectedModel, setSelectedModel] = useState("Anthropic Claude V2");
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

  function handleResetChat() {
    resetChat();
  }

  function handleResetDocument() {
    resetDocument();
  }

  function handleResetModel() {
    resetModel();
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

  const onItemClickEventDocument = (event) => {
    const selectedItemId = event.detail.id;
    sendValue(selectedItemId);
    setSelectedDocument(selectedItemId);
    resetDocument();
    resetChat();

    setCallback((value) => {
      console.log("");
    });
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
  const [documentData, setDocumentData] = useState([]);

  useEffect(() => {
    const fetchSyncRuns = async () => {
      try {
        const response = await API.get("api", "/api/document/list");
        const labels = response;
        const labelPairs = labels
          .filter((label) => label.document_status.S === "Completed")
          .map((label) => ({
            id: label.id.S.replace(".pdf", ""),
            text: label.id.S.replace(".pdf", ""),
            iconUrl:
              "https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg",
          }));

        setDocumentData(labelPairs);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchSyncRuns();
  }, []);

  const onSyncRunRefresh = async () => {
    try {
      const response = await API.get("api", "/api/document/list");
      const labels = response;
      const labelPairs = labels
        .filter((label) => label.document_status.S === "Completed")
        .map((label) => ({
          id: label.id.S.replace(".pdf", ""),
          text: label.id.S.replace(".pdf", ""),
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg",
        }));
      setDocumentData(labelPairs);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const onItemClickEventReset = () => {
    onSyncRunRefresh();
    handleResetChat();
  };

  return (
    <TopNav
      i18nStrings={i18nStrings}
      identity={{
        href: "/",
        title: "Guru",
        logo: {
          src: "guru.svg",
          alt: "Guru",
        },
      }}
      utilities={[
        {
          type: "button",
          variant: "primary",
          text: "   New Chat",
          title: "   New Chat",
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/f/f4/Papirus-64-apps-neochat.svg",
          onClick: () => onItemClickEventReset(),
        },
        {
          type: "menu-dropdown",
          text: selectedDocument,
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/7/71/Notepad_icon.svg",
          onItemClick: (e) => onItemClickEventDocument(e),
          items: documentData.filter((item) => item.id !== selectedDocument),
        },

        {
          type: "menu-dropdown",
          text: selectedModel,
          iconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/1/1b/Crystal_kbackgammon_engine.svg",
          onItemClick: (e) => onItemClickEventModel(e),
          items: [
            {
              id: "Anthropic Claude V2",
              text: "Anthropic Claude V2",
              iconUrl:
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
            },
            {
              id: "Anthropic Claude V1",
              text: "Anthropic Claude V1",
              iconUrl:
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
            },
            {
              id: "AI21 Jurassic-2 Ultra V1",
              text: "AI21 Jurassic-2 Ultra V1",
              iconUrl:
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
            },
            {
              id: "AI21 Jurassic-2 Mid V1",
              text: "AI21 Jurassic-2 Mid V1",
              iconUrl:
                "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tools_nicu_buculei_01.svg",
            },
          ].filter((item) => item.id !== selectedModel),
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
              id: "Document Tools",
              text: "Document Tools",
              items: [
                {
                  id: "Upload Document",
                  text: "Upload Document",
                  iconUrl:
                    "https://upload.wikimedia.org/wikipedia/commons/e/e6/Upload.svg",
                  href: "/upload",
                },
              ],
            },
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
