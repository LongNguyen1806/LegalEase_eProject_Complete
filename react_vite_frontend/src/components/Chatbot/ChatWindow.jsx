import React, { useState, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import "./Chatbot.css";

export default function ChatWindow({ isOpen, onClose, messages, onSendMessage, isLoading }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className='chatbot-window'>
      <div className='chat-header'>
        <div className='bot-info'>
          <div className='bot-avatar'>🤖</div>
          <div>
            <div style={{ fontWeight: "bold" }}>LegalAuto AI</div>
            <div style={{ fontSize: "11px", opacity: 0.8 }}>Online Support</div>
          </div>
        </div>
        <button className='close-btn' onClick={onClose}>
          &times;
        </button>
      </div>

      <div className='chat-body'>
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}

        {isLoading && (
          <div className='message-row bot'>
            <div className='typing-indicator'>
              <div className='dot'></div>
              <div className='dot'></div>
              <div className='dot'></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className='chat-footer' onSubmit={handleSubmit}>
        <input
          type='text'
          className='chat-input'
          placeholder='Ask about laws, find a lawyer…'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type='submit' className='send-btn' disabled={isLoading || !input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
