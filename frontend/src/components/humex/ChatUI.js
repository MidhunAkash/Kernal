import React, { useState, useEffect, useRef, useCallback } from "react";
import Card from "./Card";
import Button from "./Button";
import { supabase } from "../../lib/supabase";

function formatNow() {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Live chat over Supabase Realtime broadcast channel.
 * When `sessionId` is provided, messages are broadcast on
 * `mcp-session-<sessionId>` as `chat-message` events.
 */
function ChatUI({ sessionId = "", senderName = "Solver", senderRole = "solver" }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [connected, setConnected] = useState(false);
  const listRef = useRef(null);
  const channelRef = useRef(null);
  const localIdRef = useRef(
    `${senderRole}-${Math.random().toString(36).slice(2, 10)}`
  );

  /* subscribe to realtime channel */
  useEffect(() => {
    if (!sessionId) return undefined;

    const channelName = `mcp-session-${sessionId}`;
    const ch = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    ch.on("broadcast", { event: "chat-message" }, ({ payload }) => {
      if (!payload) return;
      setMessages((prev) => [
        ...prev,
        {
          id: payload.id || `${Date.now()}-${Math.random()}`,
          sender: payload.sender || "poster",
          name: payload.name || "Peer",
          message: payload.message || "",
          timestamp: payload.timestamp || formatNow(),
        },
      ]);
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") setConnected(true);
    });

    channelRef.current = ch;
    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {
        /* noop */
      }
      channelRef.current = null;
      setConnected(false);
    };
  }, [sessionId]);

  /* auto-scroll */
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;

    const msg = {
      id: `${localIdRef.current}-${Date.now()}`,
      sender: senderRole,
      name: senderName,
      message: text,
      timestamp: formatNow(),
    };

    // optimistic local append
    setMessages((prev) => [...prev, msg]);
    setInputValue("");

    // broadcast over supabase realtime if bound to a session
    if (channelRef.current && connected) {
      try {
        await channelRef.current.send({
          type: "broadcast",
          event: "chat-message",
          payload: msg,
        });
      } catch {
        /* silent — optimistic message already shown */
      }
    }
  }, [inputValue, senderName, senderRole, connected]);

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Card className="chat-card">
      <div className="section-label" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
        <span>CHAT</span>
        {sessionId && (
          <span
            className={`status-dot ${connected ? "status-dot-green" : "status-dot-amber"}`}
            title={connected ? "Realtime connected" : "Connecting…"}
          />
        )}
      </div>
      <div className="chat-list" ref={listRef} data-testid="chat-list">
        {messages.length === 0 && (
          <div className="chat-empty" data-testid="chat-empty">
            {sessionId
              ? "No messages yet. Type below to open the line with the job poster."
              : "No messages yet."}
          </div>
        )}
        {messages.map((m) => {
          const isSelf = m.sender === senderRole;
          return (
            <div
              key={m.id}
              className={`chat-row ${isSelf ? "chat-row-right" : "chat-row-left"}`}
            >
              <div className="chat-meta">
                <span className="chat-name">{m.name}</span>
                <span className="chat-time">{m.timestamp}</span>
              </div>
              <div className={`chat-bubble ${isSelf ? "bubble-right" : "bubble-left"}`}>
                {m.message}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKey}
          placeholder={sessionId ? "Type a message…" : "Chat not available"}
          disabled={!sessionId}
          data-testid="chat-input"
        />
        <Button
          variant="primary"
          onClick={send}
          disabled={!sessionId || !inputValue.trim()}
          data-testid="chat-send-btn"
        >
          Send
        </Button>
      </div>
    </Card>
  );
}

export default ChatUI;
