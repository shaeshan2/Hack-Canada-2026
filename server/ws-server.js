/**
 * DeedScan WebSocket chat server (Express + Socket.io)
 * Run from repo root: node server/ws-server.js
 * Listens on WS_PORT (default 3001). Next.js runs on 3000.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PORT = Number(process.env.WS_PORT) || 3001;

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.AUTH0_BASE_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Map socket.id -> { userId }
const socketToUser = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
  if (!userId) {
    socket.emit("error", { message: "userId required in auth or query" });
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
      socket.emit("error", { message: "Invalid send_message payload" });
      return;
    }

    try {
      const message = await prisma.message.create({
        data: {
          senderId,
          recipientId,
          listingId,
          content: content.trim()
        },
        include: {
          sender: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true } }
        }
      });

      socket.emit("new_message", message);
      io.to(`user:${recipientId}`).emit("new_message", message);
    } catch (err) {
      console.error("[WS] send_message error:", err);
      socket.emit("error", { message: "Failed to save message" });
    }
  });

  socket.on("disconnect", () => {
    socketToUser.delete(socket.id);
    console.log(`[WS] User ${userId} disconnected`);
  });
});

server.listen(PORT, () => {
  console.log(`DeedScan WebSocket server listening on http://localhost:${PORT}`);
});
