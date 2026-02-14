"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { apiRequest } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth";
import { SOCKET_URL } from "@/lib/config";
import type { ChatMessage } from "@/lib/types";

type MyRoomResponse = {
  chat: { id: string };
  messages: ChatMessage[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function ChatPageContent() {
  const user = getStoredUser();
  const token = getToken();
  const isUser = user?.role === "USER";
  const [chatId, setChatId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) return;

    apiRequest<MyRoomResponse>("/api/chat/my-room", { token })
      .then((res) => {
        setChatId(res.chat.id);
        setMessages(res.messages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load chat"))
      .finally(() => setReady(true));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("chat:message", (payload: { chatId: string; message: ChatMessage }) => {
      if (payload.chatId !== chatId) return;
      setMessages((prev) => [...prev, payload.message]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatId, token]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const helperText = useMemo(() => {
    if (!user) return "";
    if (user.role === "USER") return "Pesan kamu akan muncul di kanan, balasan admin di kiri.";
    return "Role admin/founder juga bisa melihat room ini untuk testing.";
  }, [user]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || !token || !isUser) return;

    setSending(true);
    setError("");
    try {
      const response = await apiRequest<{ message: ChatMessage }>("/api/chat/my-room/messages", {
        method: "POST",
        token,
        body: { body }
      });
      setMessages((prev) => [...prev, response.message]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <AppHeader />
      <section className="panel chat-room">
        <h2 className="text-2xl font-bold">Chat Admin</h2>
        <p className="hint mt-1">{helperText}</p>
        {!ready ? <p className="mt-4 text-sm text-slate-500">Loading chat...</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="message-flow mt-4" ref={listRef}>
          {messages.map((message) => {
            const mine = message.senderId === user?.id;
            return (
              <div key={message.id} className={mine ? "bubble-wrap mine" : "bubble-wrap"}>
                <div className="bubble">
                  <p className="bubble-head">@{message.sender.username}</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{message.body}</p>
                  <p className="bubble-time">{formatTime(message.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form className="message-input-row" onSubmit={sendMessage}>
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={isUser ? "Ketik pesan ke admin..." : "Role ini tidak bisa kirim dari endpoint user"}
            disabled={!isUser}
          />
          <button className="btn" type="submit" disabled={!isUser || sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <div className="page-shell">
        <main className="container">
          <ChatPageContent />
        </main>
      </div>
    </AuthGuard>
  );
}
