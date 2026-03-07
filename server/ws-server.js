/**
 * DeedScan WebSocket chat server (Socket.io)
 * Run from repo root: node server/ws-server.js
 * Listens on WS_PORT (default 3001). Next.js runs on 3000.
 *
 * Spec-aligned:
 * - Socket.io path: /ws/chat
 * - Auth: Auth0 JWT in query string (?token=...)
 * - On connect: joins user's active conversation rooms
 * - On message: stores DB record + broadcasts to recipient
 * - On disconnect: leaves joined rooms
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PORT = Number(process.env.WS_PORT) || 3001;
const BASE_URL = process.env.AUTH0_BASE_URL || "http://localhost:3000";
const AUTH0_ISSUER =
  (process.env.AUTH0_ISSUER_BASE_URL || (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : ""))
    .replace(/\/+$/, "");
let jwksCache = null;

const server = http.createServer();
const io = new Server(server, {
  path: "/ws/chat",
  cors: {
    origin: BASE_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

const socketToUser = new Map();
const socketRooms = new Map();

function conversationRoom(listingId, userA, userB) {
  const [left, right] = [userA, userB].sort();
  return `conv:${listingId}:${left}:${right}`;
}

async function verifyAuth0Jwt(token) {
  if (!token || typeof token !== "string") throw new Error("Missing token");
  if (!AUTH0_ISSUER) throw new Error("Missing Auth0 issuer config");

  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${AUTH0_ISSUER}/.well-known/jwks.json`));
  }

  const { payload } = await jwtVerify(token, jwksCache, {
    issuer: `${AUTH0_ISSUER}/`
  });
  return payload;
}

io.on("connection", async (socket) => {
  const token = socket.handshake.query?.token;
  if (!token || typeof token !== "string") {
    socket.emit("error", { code: "AUTH_REQUIRED", message: "Auth0 JWT token required in query string" });
    socket.disconnect(true);
    return;
  }

  let userId = null;
  try {
    const payload = await verifyAuth0Jwt(token);
    const auth0Id = payload.sub;
    if (!auth0Id || typeof auth0Id !== "string") {
      socket.emit("error", { code: "INVALID_TOKEN", message: "Token missing subject claim" });
      socket.disconnect(true);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { auth0Id },
      select: { id: true, name: true },
    });
    if (!user) {
      socket.emit("error", { code: "INVALID_USER", message: "User not found" });
      socket.disconnect(true);
      return;
    }
    userId = user.id;
    socketToUser.set(socket.id, { userId, name: user.name });
  } catch (err) {
    console.error("[WS] Token verification error:", err);
    socket.emit("error", { code: "SERVER_ERROR", message: "Verification failed" });
    socket.disconnect(true);
    return;
  }

  const joined = new Set();
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  joined.add(userRoom);

  // Join all active conversation rooms on connect.
  try {
    const history = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }]
      },
      select: {
        listingId: true,
        senderId: true,
        recipientId: true
      }
    });
    for (const m of history) {
      const otherUser = m.senderId === userId ? m.recipientId : m.senderId;
      const room = conversationRoom(m.listingId, userId, otherUser);
      socket.join(room);
      joined.add(room);
    }
  } catch (err) {
    console.error("[WS] Conversation join error:", err);
  }

  socketRooms.set(socket.id, joined);
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
      const room = conversationRoom(listingId, senderId, recipientId);
      socket.join(room);
      const trackedRooms = socketRooms.get(socket.id);
      if (trackedRooms) trackedRooms.add(room);

      io.to(room).emit("new_message", payload);
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
    const rooms = socketRooms.get(socket.id);
    if (rooms) {
      for (const room of rooms) {
        socket.leave(room);
      }
    }
    socketRooms.delete(socket.id);
    socketToUser.delete(socket.id);
    console.log(`[WS] User ${userId} disconnected`);
  });
});

server.listen(PORT, () => {
  console.log(`DeedScan WebSocket server at http://localhost:${PORT}`);
});
