import { useUser } from "@auth0/nextjs-auth0/client";
import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";

type Message = {
    role: "user" | "model";
    text: string;
};

export default function ChatWidget() {
    const { user } = useUser();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Don't render if not logged in
    if (!user) return null;

    function scrollToBottom() {
        setTimeout(() => {
            if (bodyRef.current) {
                bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
            }
        }, 50);
    }

    async function sendMessage(text: string) {
        if (!text.trim() || loading) return;

        const userMsg: Message = { role: "user", text: text.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);
        scrollToBottom();

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text.trim(),
                    history: newMessages.slice(-10),
                }),
            });

            const data = (await res.json()) as { reply?: string; error?: string };
            const reply = data.reply ?? data.error ?? "No response";
            setMessages((prev) => [...prev, { role: "model", text: reply }]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "model",
                    text: "Oops, couldn't reach Deedy right now. Try again! 🏠",
                },
            ]);
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        void sendMessage(input);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendMessage(input);
        }
    }

    return (
        <>
            {/* Floating bubble */}
            {!open && (
                <button
                    className="deedy-fab"
                    onClick={() => {
                        setOpen(true);
                        setTimeout(() => inputRef.current?.focus(), 200);
                    }}
                    aria-label="Chat with Deedy"
                >
                    <span className="deedy-fab-icon">🏠</span>
                    <span className="deedy-fab-label">Deedy</span>
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div className="deedy-panel">
                    {/* Header */}
                    <div className="deedy-header">
                        <div className="deedy-header-left">
                            <span className="deedy-avatar">🏠</span>
                            <div>
                                <div className="deedy-name">Deedy</div>
                                <div className="deedy-status">
                                    {loading ? "Thinking…" : "Online"}
                                </div>
                            </div>
                        </div>
                        <button
                            className="deedy-close"
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="deedy-body" ref={bodyRef}>
                        {messages.length === 0 && (
                            <div className="deedy-welcome">
                                <span className="deedy-welcome-icon">🏠</span>
                                <h3>Hey there! I&apos;m Deedy</h3>
                                <p>
                                    Your DeedScan AI sidekick. Ask me about listings, prices,
                                    confidence scores, or how to get started selling!
                                </p>
                                <div className="deedy-suggestions">
                                    <button
                                        onClick={() => void sendMessage("What listings are available?")}
                                    >
                                        📍 Show listings
                                    </button>
                                    <button
                                        onClick={() =>
                                            void sendMessage("What documents do I need to sell a property?")
                                        }
                                    >
                                        📄 Docs needed
                                    </button>
                                    <button
                                        onClick={() =>
                                            void sendMessage("How do confidence scores work?")
                                        }
                                    >
                                        🛡️ Confidence scores
                                    </button>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`deedy-msg ${msg.role === "user" ? "deedy-msg-user" : "deedy-msg-bot"}`}
                            >
                                {msg.role === "model" && (
                                    <span className="deedy-msg-avatar">🏠</span>
                                )}
                                <div className="deedy-msg-bubble">
                                    {msg.text.split("\n").map((line, j) => (
                                        <span key={j}>
                                            {line}
                                            {j < msg.text.split("\n").length - 1 && <br />}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="deedy-msg deedy-msg-bot">
                                <span className="deedy-msg-avatar">🏠</span>
                                <div className="deedy-msg-bubble deedy-typing">
                                    <span className="deedy-dot" />
                                    <span className="deedy-dot" />
                                    <span className="deedy-dot" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form className="deedy-input-bar" onSubmit={handleSubmit}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Ask Deedy anything…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            autoComplete="off"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            aria-label="Send"
                        >
                            ↑
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
