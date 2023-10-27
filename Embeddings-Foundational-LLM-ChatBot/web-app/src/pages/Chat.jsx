// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { API } from "aws-amplify";
import { useState, useEffect, useRef } from "react";
import * as React from "react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { Avatar, MessageCustomContent } from "@chatscope/chat-ui-kit-react";
import { stripHtml } from "string-strip-html";
import {
    setResetChatFunction,
    setResetDocumentFunction,
    setResetModelFunction,
    setCallback,
    setCallbackOne,
} from "./chatUtils";

import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput,
    TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import styled from "styled-components";
import { applyTheme } from "@cloudscape-design/components/theming";

applyTheme({
    theme: {
        tokens: {
            fontFamilyBase: "'Amazon Ember', 'Helvetica Neue', Roboto, Arial, sans-serif",
            borderRadiusContainer: "0.125rem",
            borderRadiusButton: "0.250rem",
        },
        contexts: {
            header: {
                tokens: {
                    colorBackgroundContainerHeader: "transparent",
                },
            },
        },
    },
});

export function Chat() {
    const ref = useRef(null);
    const [isThinking, setIsThinking] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId, setConversationId] = useState("");
    const [knowledgeSource, setKnowledgeSource] = useState("Amazon Annual Report");

    const [url, setUrl] = useState("api/ai21-ultra-v1");

    const [messages, setMessages] = useState([
        {
            message: "Hello, I'm Guru! Ask me anything!",
            sentTime: "just now",
            sender: "Guru",
        },
    ]);

    function removeTags(text) {
        const strippedText = stripHtml(text).result;
        return strippedText;
    }

    useEffect(() => {
        setResetChatFunction(resetChat);
        return () => {
            setResetChatFunction(null);
        };
    }, []);

    useEffect(() => {
        setResetDocumentFunction(resetDocument);
        return () => {
            setResetDocumentFunction(null);
        };
    }, []);

    useEffect(() => {
        setResetModelFunction(resetModel);
        return () => {
            setResetModelFunction(null);
        };
    }, []);

    function resetChat() {
        setMessages([
            {
                message: "Hello, I'm Guru! Ask me anything!",
                sentTime: "just now",
                sender: "Guru",
            },
        ]);
        setConversationId("");
        setIsThinking(false);
        setIsTyping(false);
    }

    useEffect(() => {
        setCallback((value) => {
            resetDocument(value);
        });
    }, [resetDocument]);

    useEffect(() => {
        setCallbackOne((value) => {
            resetModel(value);
        });
    }, [resetModel]);

    function resetDocument(value) {
        if (value === "aws-nltkV1-vectorstore") {
            setKnowledgeSource(value + ".pkl.zip");
        } else {
            setKnowledgeSource(value + "-vectorstore.pkl.zip");
        }
    }

    function resetModel(value) {
        if (value === "AI21 Jurassic-2 Ultra V1") {
            setUrl("api/ai21-ultra-v1");
        } else if (value === "AI21 Jurassic-2 Mid V1") {
            setUrl("api/ai21-mid-v1");
        } else if (value === "Anthropic Claude V1") {
            setUrl("api/anthropic-claude-v1");
        } else if (value === "Anthropic Claude V2") {
            setUrl("api/anthropic-claude-v2");
        } else if (value === "Claude Instant V1") {
            setUrl("api/anthropic-claude-instant-v1");
        } else if (value === "Amazon Titan G1 Express Text") {
            setUrl("api/amazon-titan-g1-express-text");
        } else if (value === "Cohere Command Text") {
            setUrl("api/cohere-command-text-claudev2");
        }
    }

    const handleSend = async (message) => {
        message = removeTags(message);
        const newMessage = {
            message,
            direction: "outgoing",
            sender: "User",
        };
        const newMessages = [...messages, newMessage];
        setMessages(newMessages);
        setIsThinking(true);
        setIsTyping(true);
        await processMessageToChat(newMessages);
    };

    useEffect(() => {
        if (!isThinking && window.responseCompleteCallback) {
            window.responseCompleteCallback();
        }
    }, [isThinking]);

    useEffect(() => {
        setTimeout(() => {
            if (ref.current) {
                ref.current.scrollToBottom("auto");
            }
        }, 100);
    }, [messages, ref]);

    async function processMessageToChat(chatMessages) {
        let apiMessages = chatMessages.map((messageObject) => {
            return {
                question: messageObject.message,
                content: messageObject.message,
            };
        });

        const lastMessage = apiMessages.pop()["question"];
        const listMsg = {
            question: lastMessage,
            vectorstore_key: knowledgeSource,
            conversation_id: conversationId,
        };

        async function retryAPICall(url, maxRetries = 4) {
            let retries = 0;
            let delay = 10000;
            while (retries < maxRetries) {
                try {
                    const response = await API.post("api", url, {
                        body: listMsg,
                    });

                    return response;
                } catch (error) {
                    console.error("API call failed:", error);
                }
                // API call failed, retry after delay
                await new Promise((resolve) => setTimeout(resolve, delay));

                // Increase delay and retry count exponentially
                delay *= 2;
                retries++;
            }

            throw new Error("API call failed after maximum retries");
        }

        const getData = async () => {
            try {
                const data = await retryAPICall(url);
                if (conversationId.length === 0) {
                    setConversationId(data["conversation_id"]);
                }

                setMessages([
                    ...chatMessages,
                    {
                        message: data["answer"],
                        sender: "Guru",
                    },
                ]);

                setIsTyping(false);
                setIsThinking(false);
            } catch (error) {
                console.error("Exceeded maximum retries:", error);
                // Handle the error condition, show an error message, etc.
            }
        };
        getData();
    }

    function avatarImage(senderName) {
        const avatarDefault = senderName === "Guru";
        if (avatarDefault) {
            return <Avatar src={"df-bot.png"} name={"Guru"}></Avatar>;
        } else {
            return (
                <Avatar
                    src={"https://upload.wikimedia.org/wikipedia/commons/1/12/User_icon_2.svg"}
                    name={"User"}
                ></Avatar>
            );
        }
    }

    return (
        <div className="app">
            <MainContainer className="main-container">
                <ChatContainer className="chat-container" backgroundColor="#f1f1f1">
                    <MessageList
                        ref={ref}
                        className="message-list"
                        scrollBehavior="smooth"
                        autoScrollToBottom={true}
                        autoScrollToBottomOnMount={true}
                        typingIndicator={
                            isTyping ? <TypingIndicator content="Guru is typing" /> : null
                        }
                    >
                        {messages.map((message, i) => {
                            return (
                                <>
                                    <Message
                                        key={i}
                                        model={message}
                                        avatarPosition={message.sender === "Guru" ? "tl" : "tr"}
                                    >
                                        {avatarImage(message.sender)}
                                        <Message.CustomContent>
                                            {message.message}
                                        </Message.CustomContent>
                                    </Message>
                                </>
                            );
                        })}
                    </MessageList>
                    <MessageInput
                        placeholder="Type your question here"
                        onSend={handleSend}
                        attachButton={false}
                        sendDisabled={isThinking}
                    />
                </ChatContainer>
            </MainContainer>
        </div>
    );
}
