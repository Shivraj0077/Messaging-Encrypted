"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

import {
  importChatKeyFromBase64,
  generateChatKey,
  getCachedChatKey,
  cacheChatKey,
  decryptWithChatKey,
  encryptWithChatKey,
} from "@/lib/crypto";

import AddChatModal from "@/app/components/AddChatModal";

export default function ChatPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [chatKey, setChatKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // --------------------------------------------------
  // Load logged-in user
  // --------------------------------------------------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      Object.keys(localStorage).forEach((key) => {
        if(key.startsWith("chat_key_")) {
          localStorage.removeItem(key);
        }
      });

      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error: ", err);
    }
  }

  // --------------------------------------------------
  // Reusable function: Load all conversations
  // --------------------------------------------------
  const loadConversations = useCallback(async () => {
    if (!user) return;
  
    const { data: chats } = await supabase
      .from("chats")
      .select("*")
      .or(`participant1.eq.${user.id},participant2.eq.${user.id}`)
      .order("created_at", { ascending: false });
  
    const all = [];
  
    for (const chat of chats || []) {
      const partnerId =
        chat.participant1 === user.id ? chat.participant2 : chat.participant1;
  
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .single();
  
      all.push({
        chatId: chat.id,
        partnerEmail: profile?.username,
        chat_key: chat.chat_key,
      });
    }
  
    setConversations(all);
  }, [user]);
  

  // Load conversations after user loads
  useEffect(() => {
    if (!user) return;
    
    const fetchConversations = async () => {
      await loadConversations();
    };
    
    fetchConversations();
  }, [user, loadConversations]);
  
  // --------------------------------------------------
  // When user clicks a chat in left sidebar
  // --------------------------------------------------
  const openChat = useCallback(async (chatRow) => {
    setSelectedChat(chatRow.chatId);
    setSelectedPartner(chatRow.partnerEmail);
  
    const b64 = getCachedChatKey(chatRow.chatId) || chatRow.chat_key;
    const key = await importChatKeyFromBase64(b64);
  
    if (!getCachedChatKey(chatRow.chatId)) cacheChatKey(chatRow.chatId, b64);
  
    setChatKey(key);
    setMessages([]); 
  }, []);
  
  // --------------------------------------------------
  // Add a new chat
  // --------------------------------------------------
  const handleCreateNewChat = async (email) => {
    if (!email) return;

    try {
      const { data: partner, error: partnerErr } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", email)
        .single();

      if (partnerErr) {
        alert("User not found");
        return;
      }

      const myId = user.id;
      const otherId = partner.id;

      // check if chat exists
      const { data: existing } = await supabase
        .from("chats")
        .select("*")
        .or(
          `and(participant1.eq.${myId},participant2.eq.${otherId}),
           and(participant1.eq.${otherId},participant2.eq.${myId})`
        )
        .limit(1);

      let chatRow;

      if (existing && existing.length > 0) {
        chatRow = existing[0];
      } else {
        const { key, b64 } = await generateChatKey();

        const { data: created } = await supabase
          .from("chats")
          .insert({
            participant1: myId,
            participant2: otherId,
            chat_key: b64,
          })
          .select()
          .single();

        chatRow = created;
        cacheChatKey(chatRow.id, b64);
      }

      await loadConversations();

      openChat({
        chatId: chatRow.id,
        partnerEmail: email,
        chat_key: chatRow.chat_key,
      });

      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // --------------------------------------------------
  // Load + subscribe to messages
  // --------------------------------------------------
  useEffect(() => {
    if (!selectedChat || !chatKey) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", selectedChat)
        .order("created_at", { ascending: true });

      const out = [];

      for (const msg of data || []) {
        const content = await decryptWithChatKey(chatKey, msg.ciphertext, msg.iv);
        out.push({ ...msg, content });
      }

      setMessages(out);
    };

    loadMessages();

    const channel = supabase
      .channel("chat-" + selectedChat)
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "messages",
          event: "INSERT",
          filter: `chat_id=eq.${selectedChat}`,
        },
        async (payload) => {
          const row = payload.new;
          const content = await decryptWithChatKey(
            chatKey,
            row.ciphertext,
            row.iv
          );
          setMessages((prev) => [...prev, { ...row, content }]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedChat, chatKey]);

  // --------------------------------------------------
  // Send message
  // --------------------------------------------------
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !chatKey) return;

    const { ciphertext, iv } = await encryptWithChatKey(chatKey, text.trim());

    await supabase.from("messages").insert({
      chat_id: selectedChat,
      sender_id: user.id,
      ciphertext,
      iv,
    });

    setText("");
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="h-screen flex bg-gray-900 text-white">

      {/* LEFT SIDEBAR */}
      <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 flex items-center justify-between">
          <div className="font-bold text-xl">Chats</div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 px-3 py-1 rounded text-sm"
          >
            + Add
          </button>
          <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded text-sm">
            Logout
          </button>
        </div>

        {conversations.map((c) => (
          <div
            key={c.chatId}
            className="p-4 cursor-pointer hover:bg-gray-800 border-b border-gray-800"
            onClick={() => openChat(c)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-lg">
                {c.partnerEmail[0].toUpperCase()}
              </div>
              <div className="text-gray-200">{c.partnerEmail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT CHAT WINDOW */}
      <div className="w-2/3 flex flex-col">
        {!selectedChat ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a chat to start messaging
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-700">
              Chatting with: <span className="text-blue-400">{selectedPartner}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 max-w-xs rounded-lg ${
                    msg.sender_id === user.id
                      ? "bg-blue-600 ml-auto"
                      : "bg-gray-700 mr-auto"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSend}
              className="p-4 flex gap-2 border-t border-gray-700"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2"
                placeholder="Type a message"
              />
              <button className="bg-blue-600 px-4 py-2 rounded">Send</button>
            </form>
          </>
        )}
      </div>

      {/* ADD CHAT MODAL */}
      <AddChatModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateChat={handleCreateNewChat}
      />
    </div>
  );
}
