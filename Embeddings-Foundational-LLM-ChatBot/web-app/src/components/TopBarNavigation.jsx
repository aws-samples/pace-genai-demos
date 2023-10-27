// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from "react";
import TopNav from "@cloudscape-design/components/top-navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { Auth } from "aws-amplify";
import {
    resetChat,
    resetDocument,
    resetModel,
    sendValue,
    setCallback,
    sendValueOne,
    setCallbackOne,
} from "../pages/chatUtils";
import { API, Storage } from "aws-amplify";
import * as React from "react";

export function TopBarNavigation() {
    const [darkMode, setDarkMode] = useState(false);
    const [user, setUser] = useState("");
    const [selectedDocument, setSelectedDocument] = useState("Amazon Annual Report");
    const [selectedEmbeddings, setSelectedEmbeddings] = useState("e5-large-V1");
    const [selectedModel, setSelectedModel] = useState("AI21 Jurassic-2 Ultra V1");
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
                    .filter((label) => label.document_status.S === "COMPLETED")
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
                .filter((label) => label.document_status.S === "COMPLETED")
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
            className="top-nav"
            i18nStrings={i18nStrings}
            identity={{
                href: "/",
                title: "Guru",
                logo: {
                    src: "df-header-logo.png",
                    alt: "Guru",
                },
            }}
            utilities={[
                {
                    type: "button",
                    variant: "primary",
                    iconUrl:
                        "https://upload.wikimedia.org/wikipedia/commons/f/f4/Papirus-64-apps-neochat.svg",
                    text: "   New Chat",
                    title: "   New Chat",
                    onClick: () => onItemClickEventReset(),
                },
                {
                    type: "menu-dropdown",
                    text: selectedDocument,
                    iconUrl:
                        "https://upload.wikimedia.org/wikipedia/commons/8/8c/Toicon-icon-avocado-format.svg",
                    onItemClick: (e) => onItemClickEventDocument(e),
                    items: documentData.filter((item) => item.id !== selectedDocument),
                },

                {
                    type: "menu-dropdown",
                    text: selectedModel,
                    iconUrl:
                        "https://upload.wikimedia.org/wikipedia/commons/0/02/Icon_transparent.svg",
                    onItemClick: (e) => onItemClickEventModel(e),
                    items: [
                        {
                            id: "AI21 Jurassic-2 Ultra V1",
                            text: "AI21 Jurassic-2 Ultra V1",
                            iconUrl: "ai21_dark_24x24.svg",
                        },
                        {
                            id: "AI21 Jurassic-2 Mid V1",
                            text: "AI21 Jurassic-2 Mid V1",
                            iconUrl: "ai21_dark_24x24.svg",
                        },

                        {
                            id: "Anthropic Claude V2",
                            text: "Anthropic Claude V2",
                            iconUrl: "anthropic_dark_24x24.svg",
                        },
                        {
                            id: "Anthropic Claude V1",
                            text: "Anthropic Claude V1",
                            iconUrl: "anthropic_dark_24x24.svg",
                        },
                        {
                            id: "Claude Instant V1",
                            text: "Claude Instant V1",
                            iconUrl: "anthropic_dark_24x24.svg",
                        },
                        {
                            id: "Amazon Titan G1 Express Text",
                            text: "Amazon Titan G1 Express Text",
                            iconUrl: "amazon_dark_24x24.svg",
                        },
                        {
                            id: "Cohere Command Text",
                            text: "Cohere Command Text",
                            iconUrl: "cohere_dark_24x24.svg",
                        },
                    ].filter((item) => item.id !== selectedModel),
                },
                {
                    type: "menu-dropdown",
                    text: user,
                    description: user,
                    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ce/User-info.svg",
                    onItemClick: (e) => onItemClickEvent(e),
                    items: [
                        {
                            id: "Document Tools",
                            text: "Document Tools",
                            items: [
                                {
                                    id: "Upload Document",
                                    text: "Upload Document",
                                    href: "/upload",
                                    iconUrl:
                                        "https://upload.wikimedia.org/wikipedia/commons/e/e6/Upload.svg",
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
