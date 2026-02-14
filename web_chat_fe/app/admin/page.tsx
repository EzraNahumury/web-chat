"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { apiRequest } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth";
import { SOCKET_URL } from "@/lib/config";
import type { ChatMessage } from "@/lib/types";

type AdminChatListItem = {
  id: string;
  user: { id: string; username: string; email: string; membershipStatus: string };
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage: { body: string; createdAt: string } | null;
};

type AdminApplication = {
  id: string;
  senderBankAccountName: string;
  bankName: string;
  transferDate: string;
  amount: number;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  adminNote: string | null;
  paymentProof: { fileUrl: string } | null;
  user: { username: string; email: string };
};

type MemberRow = {
  id: string;
  username: string;
  email: string;
  membershipStatus: string;
};

function AdminPageContent() {
  const user = getStoredUser();
  const token = getToken();
  const [chatList, setChatList] = useState<AdminChatListItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);

  async function loadChats() {
    if (!token) return;
    const result = await apiRequest<{ chats: AdminChatListItem[] }>("/api/admin/chats", { token });
    setChatList(result.chats);
    if (!selectedChatId && result.chats.length > 0) {
      setSelectedChatId(result.chats[0].id);
    }
  }

  async function loadApplications() {
    if (!token) return;
    const result = await apiRequest<{ applications: AdminApplication[] }>("/api/admin/applications", { token });
    setApplications(result.applications);
  }

  async function loadMembers() {
    if (!token) return;
    const result = await apiRequest<{ members: MemberRow[] }>("/api/admin/members?status=ACTIVE", { token });
    setMembers(result.members);
  }

  async function loadChatMessages(chatId: string) {
    if (!token) return;
    const result = await apiRequest<{ messages: ChatMessage[] }>(`/api/admin/chats/${chatId}/messages`, { token });
    setMessages(result.messages);
  }

  useEffect(() => {
    Promise.all([loadChats(), loadApplications(), loadMembers()]).catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load admin panel")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!selectedChatId) return;
    loadChatMessages(selectedChatId).catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load messages")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("chat:message", (payload: { chatId: string; message: ChatMessage }) => {
      if (payload.chatId === selectedChatId) {
        setMessages((prev) => [...prev, payload.message]);
      }
      loadChats().catch(() => {});
    });

    socket.on("chat:updated", () => {
      loadChats().catch(() => {});
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId || !socketRef.current) return;
    socketRef.current.emit("chat:join", selectedChatId);
  }, [selectedChatId]);

  useEffect(() => {
    if (!flowRef.current) return;
    flowRef.current.scrollTop = flowRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedChatId || !messageInput.trim()) return;

    try {
      const result = await apiRequest<{ message: ChatMessage }>(`/api/admin/chats/${selectedChatId}/messages`, {
        method: "POST",
        token,
        body: { body: messageInput }
      });
      setMessages((prev) => [...prev, result.message]);
      setMessageInput("");
      await loadChats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    }
  }

  async function updateApplication(id: string, status: "VERIFIED" | "REJECTED") {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/applications/${id}/status`, {
        method: "PATCH",
        token,
        body: {
          status,
          adminNote:
            status === "VERIFIED"
              ? "Pendaftaran disetujui. User akan ditambahkan manual ke grup WA."
              : "Pendaftaran ditolak. Silakan cek kembali data transfer."
        }
      });
      await Promise.all([loadApplications(), loadMembers()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update application");
    }
  }

  return (
    <>
      <AppHeader />
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <section className="panel">
        <h2 className="text-2xl font-bold">Admin Panel (WA-style)</h2>
        <p className="hint mt-1">Role saat ini: {user?.role}</p>

        <div className="chat-layout mt-4">
          <aside className="chat-list">
            {chatList.map((chat) => (
              <button
                key={chat.id}
                className={selectedChatId === chat.id ? "chat-list-item active" : "chat-list-item"}
                onClick={() => setSelectedChatId(chat.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">@{chat.user.username}</p>
                  {chat.unreadCount > 0 ? <span className="unread-badge">{chat.unreadCount}</span> : null}
                </div>
                <p className="mt-1 text-xs text-slate-600">{chat.lastMessage?.body || "Belum ada chat"}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleString() : "-"}
                </p>
              </button>
            ))}
            {chatList.length === 0 ? <p className="hint">Belum ada user yang chat.</p> : null}
          </aside>

          <article className="chat-room">
            <div className="message-flow" ref={flowRef}>
              {messages.map((message) => {
                const mine = message.senderId === user?.id;
                return (
                  <div key={message.id} className={mine ? "bubble-wrap mine" : "bubble-wrap"}>
                    <div className="bubble">
                      <p className="bubble-head">@{message.sender.username}</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{message.body}</p>
                      <p className="bubble-time">{new Date(message.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form className="message-input-row" onSubmit={sendMessage}>
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Balas pesan user..."
              />
              <button className="btn" type="submit">
                Kirim
              </button>
            </form>
          </article>
        </div>
      </section>

      <section className="panel mt-4">
        <h3 className="text-xl font-bold">Pendaftaran Member</h3>
        <div className="mt-3 space-y-3">
          {applications.map((item) => (
            <article key={item.id} className="panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  @{item.user.username} - {item.bankName}
                </p>
                <span className={item.status === "VERIFIED" ? "status-pill active" : item.status === "REJECTED" ? "status-pill rejected" : "status-pill pending"}>
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Rekening: {item.senderBankAccountName} | Nominal: Rp{item.amount.toLocaleString("id-ID")}
              </p>
              <p className="mt-1 text-sm text-slate-600">Tanggal transfer: {new Date(item.transferDate).toLocaleDateString()}</p>
              {item.paymentProof ? (
                <a className="mt-2 inline-block text-sm text-teal-700 underline" href={item.paymentProof.fileUrl} target="_blank">
                  Preview bukti transfer
                </a>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button className="btn" type="button" onClick={() => updateApplication(item.id, "VERIFIED")}>
                  Verify
                </button>
                <button className="btn danger" type="button" onClick={() => updateApplication(item.id, "REJECTED")}>
                  Reject
                </button>
              </div>
            </article>
          ))}
          {applications.length === 0 ? <p className="hint">Belum ada pengajuan.</p> : null}
        </div>
      </section>

      <section className="panel mt-4">
        <h3 className="text-xl font-bold">Member Active</h3>
        <div className="mt-3 space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm">
                @{member.username} <span className="text-slate-500">({member.email})</span>
              </p>
              <span className="status-pill active">{member.membershipStatus}</span>
            </div>
          ))}
          {members.length === 0 ? <p className="hint">Belum ada member active.</p> : null}
        </div>
      </section>
    </>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard allowRoles={["ADMIN", "FOUNDER"]}>
      <div className="page-shell">
        <main className="container">
          <AdminPageContent />
        </main>
      </div>
    </AuthGuard>
  );
}
