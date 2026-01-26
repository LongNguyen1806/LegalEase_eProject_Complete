import React, { useState } from "react";
import axiosClient from "../../api/apiAxios";
import ChatWindow from "./ChatWindow";
import "./Chatbot.css";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Hello! I’m LegalAuto 🤖. How can I assist you today with legal matters or finding a lawyer?",
    },
  ]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (text) => {
    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axiosClient.post("/ai/chat", {
        question: text,
      });

      if (response.data.success) {
        const botAnswer = response.data.data.answer;
        const botMessage = { role: "bot", content: botAnswer };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage = {
        role: "bot",
        content: "Connection error. Please try again later.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button className='chatbot-trigger-btn' onClick={toggleChat}>
          💬
        </button>
      )}
      <ChatWindow isOpen={isOpen} onClose={toggleChat} messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
    </>
  );
}
