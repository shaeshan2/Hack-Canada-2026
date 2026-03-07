/**
 * DeedScan WebSocket chat server (Socket.io)
 * Run from repo root: node server/ws-server.js
 * Listens on WS_PORT (default 3001). Next.js runs on 3000.
 *
 * Connects to the same Prisma DB; validates userId so only real users can join.
 * Events: send_message, typing_start, typing_stop; emits new_message, typing.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PORT = Number(process.env.WS_PORT) || 3001;
const BASE_URL = process.env.AUTH0_BASE_URL || "http://localhost:3000";

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: BASE_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

const socketToUser = new Map();

io.on("connection", async (socket) => {
  const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
  if (!userId || typeof userId !== "string") {
    socket.emit("error", { code: "AUTH_REQUIRED", message: "userId required in auth or query" });
    socket.disconnect(true);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (!user) {
      socket.emit("error", { code: "INVALID_USER", message: "User not found" });
      socket.disconnect(true);
      return;
    }
  } catch (err) {
    console.error("[WS] DB check error:", err);
    socket.emit("error", { code: "SERVER_ERROR", message: "Verification failed" });
    socket.disconnect(true);
    return;
  }

  socketToUser.set(socket.id, { userId });
  socket.join(`user:${userId}`);
  console.log(`[WS] User ${userId} connected (${socket.id})`);

  socket.on("send_message", async (data) => {
    const { recipientId, listingId, content } = data || {};
    const senderId = socketToUser.get(socket.id)?.userId;
    if (!senderId || !recipientId || !listingId || typeof content !== "string" || !content.trim()) {
      socket.emit("error", { code: "VALIDATION", message: "Invalid send_message payload" });
      return;
    }

    try {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { sellerId: true },
      });
      if (!listing) {
        socket.emit("error", { code: "NOT_FOUND", message: "Listing not found" });
        return;
      }
      if (recipientId !== listing.sellerId) {
        socket.emit("error", { code: "FORBIDDEN", message: "Recipient must be the listing seller" });
        return;
      }

      const message = await prisma.message.create({
        data: {
          senderId,
          recipientId,
          listingId,
          content: content.trim(),
        },
        include: {
          sender: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } },
        },
      });

      const payload = {
        ...message,
        createdAt: message.createdAt.toISOString(),
      };
      socket.emit("new_message", payload);
      io.to(`user:${recipientId}`).emit("new_message", payload);
    } catch (err) {
      console.error("[WS] send_message error:", err);
      socket.emit("error", { code: "SERVER_ERROR", message: "Failed to save message" });
    }
  });

  socket.on("typing_start", (data) => {
    const { listingId, recipientId } = data || {};
    const senderId = socketToUser.get(socket.id)?.userId;
    if (!senderId || !recipientId || !listingId) return;
    io.to(`user:${recipientId}`).emit("typing", {
      listingId,
      userId: senderId,
      name: socketToUser.get(socket.id)?.name ?? "Someone",
    });
  });

  socket.on("typing_stop", (data) => {
    const { listingId, recipientId } = data || {};
    const senderId = socketToUser.get(socket.id)?.userId;
    if (!senderId || !recipientId || !listingId) return;
    io.to(`user:${recipientId}`).emit("typing_stop", { listingId, userId: senderId });
  });

  socket.on("disconnect", () => {
    socketToUser.delete(socket.id);
    console.log(`[WS] User ${userId} disconnected`);
  });
});

server.listen(PORT, () => {
  console.log(`DeedScan WebSocket server at http://localhost:${PORT}`);
});
