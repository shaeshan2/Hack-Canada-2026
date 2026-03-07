import { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import "../lib/auth0-env";
import { getSession } from "@auth0/nextjs-auth0";
import { ensureDbUser } from "../lib/session-user";
import { clearSignupIntentCookie, getSignupIntentRole } from "../lib/signup-intent";
import { useSocketOptional } from "../contexts/SocketContext";
import type { ChatMessage } from "../contexts/SocketContext";

type ConversationItem = {
  listingId: string;
  listing: { id: string; title: string; address: string };
  otherUser: { id: string; name: string | null };
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
};

type MessagesPageProps = {
  user: { name?: string; email?: string } | null;
};

export default function MessagesPage({ user }: MessagesPageProps) {
  const router = useRouter();
  const { listingId, otherUserId } = router.query as { listingId?: string; otherUserId?: string };
  const socket = useSocketOptional();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/conversations", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user || !listingId) return;
    setLoading(true);
    const q = otherUserId ? `&otherUserId=${otherUserId}` : "";
    fetch(`/api/messages?listingId=${listingId}${q}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: ChatMessage[]) => {
        setMessages(list);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [user, listingId, otherUserId]);

  useEffect(() => {
    if (listingId && otherUserId && conversations.length > 0) {
      const c = conversations.find(
        (x) => x.listingId === listingId && x.otherUser.id === otherUserId
      );
      setListingTitle(c?.listing.title ?? null);
    } else if (listingId && !listingTitle) {
      fetch(`/api/listings/${listingId}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((l: { title?: string } | null) => l && setListingTitle(l.title ?? null))
        .catch(() => {});
    }
  }, [listingId, otherUserId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!socket || !listingId || !otherUserId) return;
    const unsub = socket.subscribeNewMessage((msg) => {
      if (msg.listingId === listingId && (msg.senderId === otherUserId || msg.recipientId === otherUserId)) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    });
    return unsub;
  }, [socket, listingId, otherUserId]);

  useEffect(() => {
    if (!socket || !listingId || otherUserId !== undefined) return;
    const unsub = socket.subscribeNewMessage(() => {
      fetch("/api/conversations", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : []))
        .then(setConversations)
        .catch(() => {});
    });
    return unsub;
  }, [socket, listingId, otherUserId]);

  useEffect(() => {
    if (!socket || !listingId || !otherUserId) return;
    const unsubTyping = socket.subscribeTyping((data) => {
      if (data.listingId === listingId && data.userId === otherUserId) {
        setTypingName(data.name);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingName(null), 3000);
      }
    });
    const unsubStop = socket.subscribeTypingStop((data) => {
      if (data.listingId === listingId && data.userId === otherUserId) setTypingName(null);
    });
    return () => {
      unsubTyping();
      unsubStop();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, listingId, otherUserId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !listingId || !otherUserId) return;
    if (socket?.connected) {
      setSending(true);
      socket.sendMessage(otherUserId, listingId, text);
      setInput("");
      setSending(false);
    } else {
      setSending(true);
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: otherUserId, listingId, content: text }),
      })
        .then((res) => res.json())
        .then((msg) => {
          if (msg.id) setMessages((prev) => [...prev, { ...msg, createdAt: msg.createdAt ?? new Date().toISOString() }]);
          setInput("");
        })
        .catch(() => {})
        .finally(() => setSending(false));
    }
  }, [input, listingId, otherUserId, socket]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!user) {
    return (
      <main className="container">
        <p>Log in to view messages.</p>
        <a href="/api/auth/login">Log in</a>
        <br />
        <Link href="/">Back to DeedScan</Link>
      </main>
    );
  }

  return (
    <main className="container messages-page">
      <header className="hero">
        <Link href="/">← DeedScan</Link>
        <h1>Messages</h1>
      </header>

      <div className="messages-layout">
        <aside className="conversations-list card">
          {loading && !listingId ? (
            <p>Loading…</p>
          ) : (
            <>
              {conversations.length === 0 && !listingId && <p>No conversations yet.</p>}
              {conversations.map((c) => (
                <Link
                  key={`${c.listingId}-${c.otherUser.id}`}
                  href={`/messages?listingId=${c.listingId}&otherUserId=${c.otherUser.id}`}
                  className={`conversation-item ${listingId === c.listingId && otherUserId === c.otherUser.id ? "active" : ""}`}
                >
                  <strong>{c.listing.title}</strong>
                  <span>{c.otherUser.name ?? "Seller"}</span>
                  {c.lastMessage && <span className="preview">{c.lastMessage.content.slice(0, 50)}…</span>}
                  {c.unreadCount > 0 && <span className="unread">{c.unreadCount}</span>}
                </Link>
              ))}
            </>
          )}
        </aside>

        <section className="chat-panel card">
          {!listingId ? (
            <p className="placeholder">Select a conversation or <Link href="/">browse listings</Link> and tap &quot;Message seller&quot;.</p>
          ) : (
            <>
              <div className="chat-header">
                <Link href="/messages">← Back</Link>
                <span>{listingTitle ?? "Chat"}</span>
              </div>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`message ${m.senderId === socket?.userId ? "sent" : "received"}`}
                  >
                    <span className="message-content">{m.content}</span>
                    <span className="message-meta">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                {typingName && (
                  <div className="message received typing">
                    <span className="message-content">{typingName} is typing…</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => socket?.sendTypingStart(listingId, otherUserId!)}
                  onBlur={() => socket?.sendTypingStop(listingId, otherUserId!)}
                  disabled={sending}
                />
                <button type="button" onClick={handleSend} disabled={sending || !input.trim()}>
                  Send
                </button>
              </div>
              {!socket?.connected && (
                <p className="reconnect-hint">Sending via server. Connect to WebSocket for real-time delivery.</p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<MessagesPageProps> = async ({ req, res }) => {
  const session = await getSession(req, res);
  let user: MessagesPageProps["user"] = null;
  if (session?.user) {
    const signupRole = getSignupIntentRole(req);
    await ensureDbUser(session.user, signupRole);
    clearSignupIntentCookie(res);
    user = { name: session.user.name, email: session.user.email };
  }
  return { props: { user } };
};
