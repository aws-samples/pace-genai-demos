/**
 * Copyright 2023 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// --
// --  Author:        Jin Tan Ruan
// --  Date:          04/11/2023
// --  Purpose:       Chat Component
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

import { API, Auth } from "aws-amplify";
import { useState, useEffect, useRef } from "react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { Avatar } from "@chatscope/chat-ui-kit-react";
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
import { applyTheme } from "@cloudscape-design/components/theming";

applyTheme({
  theme: {
    tokens: {
      fontFamilyBase:
        "'Amazon Ember', 'Helvetica Neue', Roboto, Arial, sans-serif",
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
  const [knowledgeSource, setKnowledgeSource] = useState(
    "Amazon-Report-vectorstore.pkl.zip"
  );
  const [model, setModel] = useState("anthropic.claude-v2");

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
    if (value === "Amazon-Report-vectorstore") {
      setKnowledgeSource(value + ".pkl.zip");
    } else if (value) {
      setKnowledgeSource(value + "-vectorstore.pkl.zip");
    }
    console.log(value);
    console.log(knowledgeSource);
  }

  function resetModel(value) {
    console.log(value);
    if (value === "AI21 Jurassic-2 Ultra V1") {
      setModel("ai21.j2-ultra-v1");
    } else if (value === "AI21 Jurassic-2 Mid V1") {
      setModel("ai21.j2-mid-v1");
    } else if (value === "Anthropic Claude V1") {
      setModel("anthropic.claude-v1");
    } else if (value === "Anthropic Claude V2") {
      setModel("anthropic.claude-v2");
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
      token: (await Auth.currentSession()).getIdToken().getJwtToken(),
      vectorstore_key: knowledgeSource,
      conversation_id: conversationId,
      model_id: model,
    };

    async function retryAPICall(maxRetries = 4) {
      let retries = 0;
      let delay = 10000;
      while (retries < maxRetries) {
        try {
          console.log(listMsg);
          const response = await API.post("chatApi", "", {
            body: listMsg,
          });

          console.log(response);
          return response;
        } catch (error) {
          console.error("API call failed:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        retries++;
      }

      throw new Error("API call failed after maximum retries");
    }

    const getData = async () => {
      try {
        const data = await retryAPICall();
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
