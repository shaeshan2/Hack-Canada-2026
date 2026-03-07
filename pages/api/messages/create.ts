import type { NextApiRequest, NextApiResponse } from "next";
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";

/**
 * POST /api/messages
 * Body: { recipientId, listingId, content }
 * Creates a message and returns it. WebSocket server will broadcast to recipient.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  return withApiAuthRequired(async function createMessage(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse
  ) {
    const session = await getSession(protectedReq, protectedRes);
    if (!session?.user) {
      protectedRes.status(401).json({ error: "Not authenticated" });
      return;
    }

    const dbUser = await ensureDbUser(session.user);
    const body = protectedReq.body ?? {};
    const recipientId = body.recipientId as string;
    const listingId = body.listingId as string;
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!recipientId || !listingId || !content) {
      protectedRes.status(400).json({ error: "recipientId, listingId, and content are required" });
      return;
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { sellerId: true }
    });
    if (!listing) {
      protectedRes.status(404).json({ error: "Listing not found" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId: dbUser.id,
        recipientId,
        listingId,
        content
      },
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } }
      }
    });

    protectedRes.status(201).json(message);
  })(req, res);
}
