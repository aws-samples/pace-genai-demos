/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import { useState, useEffect, useRef } from "react";
import * as React from "react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { Avatar, MessageCustomContent } from "@chatscope/chat-ui-kit-react";
import { stripHtml } from "string-strip-html";
import { useCollection } from "@cloudscape-design/collection-hooks";
import {
  setResetChatFunction,
  setResetDocumentFunction,
  setResetModelFunction,
  setCallback,
  setCallbackOne,
} from "./chatUtils";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import { Amplify, API, Auth, Storage } from "aws-amplify";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Icon from "@cloudscape-design/components/icon";
import ThumbUpAltIcon from "@material-ui/icons/ThumbUpAlt";
import ThumbDownAltIcon from "@material-ui/icons/ThumbDownAlt";
import Link from "@cloudscape-design/components/link";

import { Tooltip, Typography, CircularProgress } from "@material-ui/core";

export function Chat() {
  const ref = useRef(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [modelId, setModelId] = useState("Anthropic-Claude-V2");

  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm Guru! Ask me anything!",
      sentTime: "just now",
      sender: "Guru",
      sources: [],
      pages: [],
    },
  ]);

  function removeTags(text) {
    const strippedText = stripHtml(text).result;
    return strippedText;
  }

  useEffect(() => {
    setResetModelFunction(resetModel);
    return () => {
      setResetModelFunction(null);
    };
  }, []);

  useEffect(() => {
    setResetChatFunction(resetChat);
    return () => {
      setResetChatFunction(null);
    };
  }, []);

  function resetModel(value) {
    if (value === "AI21 Jurassic-2 Ultra") {
      setModelId("AI21-Jurassic-2-Ultra");
    } else if (value === "Anthropic Claude V2") {
      setModelId("Anthropic-Claude-V2");
    } else if (value === "Amazon Titan Large") {
      setModelId("Amazon-Titan-Large");
    }
  }

  function resetChat() {
    setMessages([
      {
        message: "Hello, I'm Guru! Ask me anything!",
        sentTime: "just now",
        sender: "Guru",
        sources: [],
        pages: [],
      },
    ]);
    setConversationId("");
    setIsThinking(false);
    setIsTyping(false);
  }

  useEffect(() => {
    setCallbackOne((value) => {
      resetModel(value);
    });
  }, [resetModel]);

  const handleSend = async (message) => {
    message = removeTags(message);
    const newMessage = {
      message,
      direction: "outgoing",
      sender: "User",
      source_page: {},
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
      conversationId: conversationId,
      token: (await Auth.currentSession()).getIdToken().getJwtToken(),
      model_id: modelId,
    };

    const getData = async () => {
      try {
        const response = await API.post("chatApi", "", {
          body: listMsg,
        });

        setConversationId(response.conversationId);
        setMessages([
          ...chatMessages,
          {
            message: response.answer,
            sender: "Guru",
            source_page: response.source_page,
          },
        ]);
      } catch (e) {
        setMessages([
          ...chatMessages,
          {
            message:
              "Hmm, I'm experiencing problems processing this request. Please try later.",
            sender: "Guru",
            source_page: {},
          },
        ]);
      } finally {
        setIsTyping(false);
        setIsThinking(false);
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
          src={
            "https://upload.wikimedia.org/wikipedia/commons/1/12/User_icon_2.svg"
          }
          name={"User"}
        ></Avatar>
      );
    }
  }

  function mapSourceAndPage(message) {
    let items = [];

    Object.keys(message).map((key) => {
      if (key == "source_page") {
        let source_page_obj = message[key];
        Object.keys(source_page_obj).map((k) => {
          items.push(
            <SpaceBetween direction="vertical" size="xs" key={k}>
              <SpaceBetween direction="horizontal" size="xs">
                <Icon name="file" size="small" />
                <Link href={source_page_obj[k].file}>
                  {source_page_obj[k].file_name}
                </Link>
              </SpaceBetween>
            </SpaceBetween>
          );
        });
      }
    });

    return items;
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
                      <SpaceBetween direction="vertical" size="xs">
                        {message.message}
                        {message.sender === "Guru" &&
                          message.source_page &&
                          Object.keys(message.source_page).length > 0 && (
                            <ExpandableSection
                              defaultExpanded
                              headerText="Sources (by relevance)"
                            >
                              {mapSourceAndPage(message)}
                            </ExpandableSection>
                          )}
                      </SpaceBetween>
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
