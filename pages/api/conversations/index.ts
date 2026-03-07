import type { NextApiRequest, NextApiResponse } from "next";
import "../../../lib/auth0-env";
import { auth0 } from "../../../lib/auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";
import { sendError } from "../../../lib/api/errors";

export type ConversationItem = {
  listingId: string;
  listing: { id: string; title: string; address: string };
  otherUser: { id: string; name: string | null };
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
};

/**
 * GET /api/conversations
 * Returns the current user's conversations (for buyer: threads with sellers; for seller: threads with buyers).
 * Each item has listingId, listing (title, address), otherUser, lastMessage, unreadCount.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  return auth0.withApiAuthRequired(async function getConversations(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse
  ) {
    const session = await auth0.getSession(protectedReq);
    if (!session?.user) {
      sendError(protectedRes, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const signupRole = getSignupIntentRole(protectedReq);
    const dbUser = await ensureDbUser(session.user, signupRole);
    const myId = dbUser.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: myId }, { recipientId: myId }],
      },
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
        listing: { select: { id: true, title: true, address: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const byThread = new Map<string, typeof messages>();
    for (const m of messages) {
      const otherId = m.senderId === myId ? m.recipientId : m.senderId;
      const key = `${m.listingId}:${otherId}`;
      if (!byThread.has(key)) {
        byThread.set(key, []);
      }
      byThread.get(key)!.push(m);
    }

    const conversations: ConversationItem[] = [];
    for (const [, threadMessages] of byThread) {
      const first = threadMessages[0];
      const otherUser =
        first.senderId === myId
          ? { id: first.recipient.id, name: first.recipient.name }
          : { id: first.sender.id, name: first.sender.name };
      const lastMessage = threadMessages[0];
      const unreadCount = threadMessages.filter(
        (m) => m.recipientId === myId && !m.read
      ).length;

      conversations.push({
        listingId: first.listingId,
        listing: {
          id: first.listing.id,
          title: first.listing.title,
          address: first.listing.address,
        },
        otherUser: { id: otherUser.id, name: otherUser.name },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
        unreadCount,
      });
    }

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? "";
      const bTime = b.lastMessage?.createdAt ?? "";
      return bTime.localeCompare(aTime);
    });

    protectedRes.status(200).json(conversations);
  })(req, res);
}
