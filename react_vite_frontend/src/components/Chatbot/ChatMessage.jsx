import React from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  const components = {
    a: ({ node, ...props }) => {
      if (props.href && props.href.startsWith("/")) {
        return (
          <Link to={props.href} style={{ color: isUser ? "white" : "#007bff", textDecoration: "underline" }}>
            {props.children}
          </Link>
        );
      }
      return <a {...props} target='_blank' rel='noopener noreferrer' style={{ color: isUser ? "white" : "#007bff" }} />;
    },
  };

  return (
    <div className={`message-row ${isUser ? "user" : "bot"}`}>
      {!isUser && (
        <div className='bot-avatar-small' style={{ marginRight: "8px", alignSelf: "flex-end" }}>
          🤖
        </div>
      )}
      <div className={`message-bubble ${isUser ? "user" : "bot"}`}>
        <ReactMarkdown components={components}>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}
