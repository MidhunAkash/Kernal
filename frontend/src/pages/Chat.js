import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const generatePairKey = useCallback((userId1, userId2) => {
    return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from("direct_messages")
          .select("sender_id, receiver_id, pair_key, created_at")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const uniquePairs = {};
        data.forEach((msg) => {
          if (!uniquePairs[msg.pair_key]) {
            uniquePairs[msg.pair_key] = {
              otherUserId: msg.sender_id === user.id ? msg.receiver_id : msg.sender_id,
              lastMessageTime: msg.created_at,
            };
          }
        });

        const userIds = Object.values(uniquePairs).map((p) => p.otherUserId);
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds);

          if (usersError) throw usersError;
          setConversations(users);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedUser || !user) return;

    const fetchMessages = async () => {
      try {
        const pairKey = generatePairKey(user.id, selectedUser.id);
        const { data, error } = await supabase
          .from("direct_messages")
          .select("*")
          .eq("pair_key", pairKey)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    const pairKey = generatePairKey(user.id, selectedUser.id);

    const channel = supabase
      .channel(`room:${pairKey}`, {
        config: { broadcast: { self: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `pair_key=eq.${pairKey}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, user, generatePairKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email")
          .neq("id", user.id)
          .ilike("email", `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    const messageText = newMessage.trim();
    const pairKey = generatePairKey(user.id, selectedUser.id);

    try {
      const messageData = {
        sender_id: user.id,
        receiver_id: selectedUser.id,
        body: messageText,
        pair_key: pairKey,
        created_at: new Date().toISOString(),
      };

      const tempMessage = { ...messageData, id: `temp-${Date.now()}` };
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");

      const { data, error } = await supabase
        .from("direct_messages")
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => prev.map((msg) => (msg.id === tempMessage.id ? data : msg)));
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => !msg.id.toString().startsWith("temp-")));
      setNewMessage(messageText);
      alert("Failed to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const selectUserToChat = (chatUser) => {
    setSelectedUser(chatUser);
    setSearchQuery("");
    setSearchResults([]);

    if (!conversations.find((c) => c.id === chatUser.id)) {
      setConversations((prev) => [chatUser, ...prev]);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-black">HumEx Chat</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.user_metadata?.name || user?.email}
              </span>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-black">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by email..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              {loading && (
                <div className="absolute right-3 top-2.5 text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                </div>
              )}
              {!loading && searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-black"
                >
                  ✕
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => selectUserToChat(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{result.name || "Anonymous"}</div>
                    <div className="text-xs text-gray-500">{result.email}</div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !loading && (
              <div className="mt-2 text-sm text-gray-500 text-center py-2">No users found</div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet. Search for users to start chatting!
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedUser(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                    selectedUser?.id === conv.id ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="font-medium text-sm">{conv.name || "Anonymous"}</div>
                  <div className="text-xs text-gray-500">{conv.email}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="font-bold">{selectedUser.name || "Anonymous"}</div>
                <div className="text-sm text-gray-500">{selectedUser.email}</div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.sender_id === user.id
                          ? "bg-black text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="break-words">{msg.body}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-white border-t border-gray-200 p-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-xl mb-2">Welcome to Chat!</p>
                <p>Search for a user or select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;
