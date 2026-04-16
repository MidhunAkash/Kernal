import React, { useEffect, useRef, useState } from "react";
import Card from "./Card";
import Button from "./Button";

const POSTER_REPLIES = [
  "Got it, thanks for the update.",
  "Makes sense. Please keep me posted.",
  "Sounds good — let me know if you need more context.",
  "Appreciate the quick response.",
  "Perfect. Ping me when you have a patch ready.",
];

const getNowTimestamp = () => {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const ChatUI = ({ messages: initialMessages = [] }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isPosterTyping, setIsPosterTyping] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isPosterTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const scheduleAutoReply = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsPosterTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      const reply =
        POSTER_REPLIES[Math.floor(Math.random() * POSTER_REPLIES.length)];
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          sender: "poster",
          name: "Job Poster",
          message: reply,
          timestamp: getNowTimestamp(),
        },
      ]);
      setIsPosterTyping(false);
    }, 1800);
  };

  const sendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const newMessage = {
      id: Date.now(),
      sender: "solver",
      name: "Solver",
      message: trimmed,
      timestamp: getNowTimestamp(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    scheduleAutoReply();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="chat-card">
      <div className="section-label">CHAT</div>
      <div className="chat-messages" ref={listRef} data-testid="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-row chat-row-${msg.sender}`}
            data-testid={`chat-message-${msg.sender}`}
          >
            <div className="chat-meta">
              <span className="chat-sender">{msg.name}</span>
              <span className="chat-time">{msg.timestamp}</span>
            </div>
            <div className={`chat-bubble chat-bubble-${msg.sender}`}>
              {msg.message}
            </div>
          </div>
        ))}
        {isPosterTyping && (
          <div
            className="chat-typing-row"
            data-testid="chat-typing-indicator"
            aria-live="polite"
          >
            <div className="chat-meta">
              <span className="chat-sender">Job Poster</span>
              <span className="chat-time">typing…</span>
            </div>
            <div className="chat-typing-bubble" aria-hidden="true">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </div>
          </div>
        )}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          data-testid="chat-input"
        />
        <Button
          variant="primary"
          onClick={sendMessage}
          className="chat-send-btn"
        >
          Send
        </Button>
      </div>
    </Card>
  );
};

export default ChatUI;
