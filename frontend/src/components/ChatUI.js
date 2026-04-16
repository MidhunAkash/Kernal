import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import Button from './Button';

const ChatUI = ({ messages: initialMessages = [] }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes().toString().padStart(2, '0');
    const suffix = hh >= 12 ? 'PM' : 'AM';
    const h12 = ((hh + 11) % 12) + 1;
    const timestamp = `${h12}:${mm} ${suffix}`;
    const newMsg = {
      id: Date.now(),
      sender: 'solver',
      name: 'Solver',
      message: trimmed,
      timestamp,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="chat-card">
      <div className="section-label">CHAT</div>
      <div className="chat-messages" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-row ${m.sender === 'solver' ? 'chat-row-right' : 'chat-row-left'}`}
          >
            <div className="chat-meta">
              <span className="chat-name">{m.name}</span>
              <span className="chat-time">{m.timestamp}</span>
            </div>
            <div className={`chat-bubble ${m.sender === 'solver' ? 'bubble-right' : 'bubble-left'}`}>
              {m.message}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button variant="primary" onClick={handleSend}>Send</Button>
      </div>
    </Card>
  );
};

export default ChatUI;
