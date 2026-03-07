"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const WS_URL =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_WS_URL
    ? process.env.NEXT_PUBLIC_WS_URL
    : typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : "";

export type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  listingId: string;
  createdAt: string;
  sender?: { id: string; name: string | null };
  recipient?: { id: string; name: string | null };
};

type SocketContextValue = {
  connected: boolean;
  userId: string | null;
  sendMessage: (recipientId: string, listingId: string, content: string) => void;
  sendTypingStart: (listingId: string, recipientId: string) => void;
  sendTypingStop: (listingId: string, recipientId: string) => void;
  subscribeNewMessage: (cb: (msg: ChatMessage) => void) => () => void;
  subscribeTyping: (cb: (data: { listingId: string; userId: string; name: string }) => void) => () => void;
  subscribeTypingStop: (cb: (data: { listingId: string; userId: string }) => void) => () => void;
  subscribeError: (cb: (err: { code: string; message: string }) => void) => () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<{
    new_message: Array<(msg: ChatMessage) => void>;
    typing: Array<(data: { listingId: string; userId: string; name: string }) => void>;
    typing_stop: Array<(data: { listingId: string; userId: string }) => void>;
    error: Array<(err: { code: string; message: string }) => void>;
  }>({
    new_message: [],
    typing: [],
    typing_stop: [],
    error: [],
  });

  useEffect(() => {
    if (!WS_URL) return;

    let mounted = true;
    fetch("/api/auth/socket-token", { method: "POST", credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted || !data.authenticated || !data.userId || !data.token) return;
        setUserId(data.userId);
        const socket = io(WS_URL, {
          path: "/ws/chat",
          query: { token: data.token },
          transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => setConnected(true));
        socket.on("disconnect", () => setConnected(false));
        socket.on("new_message", (msg: ChatMessage) => {
          listenersRef.current.new_message.forEach((cb) => cb(msg));
        });
        socket.on("typing", (data: { listingId: string; userId: string; name: string }) => {
          listenersRef.current.typing.forEach((cb) => cb(data));
        });
        socket.on("typing_stop", (data: { listingId: string; userId: string }) => {
          listenersRef.current.typing_stop.forEach((cb) => cb(data));
        });
        socket.on("error", (err: { code?: string; message?: string }) => {
          listenersRef.current.error.forEach((cb) =>
            cb({ code: err.code ?? "ERROR", message: err.message ?? "Unknown error" })
          );
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      setUserId(null);
    };
  }, []);

  const sendMessage = useCallback((recipientId: string, listingId: string, content: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("send_message", { recipientId, listingId, content });
    }
  }, []);

  const sendTypingStart = useCallback((listingId: string, recipientId: string) => {
    socketRef.current?.emit("typing_start", { listingId, recipientId });
  }, []);

  const sendTypingStop = useCallback((listingId: string, recipientId: string) => {
    socketRef.current?.emit("typing_stop", { listingId, recipientId });
  }, []);

  const subscribeNewMessage = useCallback((cb: (msg: ChatMessage) => void) => {
    listenersRef.current.new_message.push(cb);
    return () => {
      listenersRef.current.new_message = listenersRef.current.new_message.filter((f) => f !== cb);
    };
  }, []);

  const subscribeTyping = useCallback(
    (cb: (data: { listingId: string; userId: string; name: string }) => void) => {
      listenersRef.current.typing.push(cb);
      return () => {
        listenersRef.current.typing = listenersRef.current.typing.filter((f) => f !== cb);
      };
    },
    []
  );

  const subscribeTypingStop = useCallback((cb: (data: { listingId: string; userId: string }) => void) => {
    listenersRef.current.typing_stop.push(cb);
    return () => {
      listenersRef.current.typing_stop = listenersRef.current.typing_stop.filter((f) => f !== cb);
    };
  }, []);

  const subscribeError = useCallback((cb: (err: { code: string; message: string }) => void) => {
    listenersRef.current.error.push(cb);
    return () => {
      listenersRef.current.error = listenersRef.current.error.filter((f) => f !== cb);
    };
  }, []);

  const value: SocketContextValue = {
    connected,
    userId,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    subscribeNewMessage,
    subscribeTyping,
    subscribeTypingStop,
    subscribeError,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
}

export function useSocketOptional() {
  return useContext(SocketContext);
}
