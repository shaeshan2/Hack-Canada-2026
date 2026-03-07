import type { NextApiRequest, NextApiResponse } from "next";
import "../../../lib/auth0-env";
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";

/**
 * GET /api/messages?listingId=...&otherUserId=...
 * Returns messages between current user and other user for the given listing.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  return withApiAuthRequired(async function getMessages(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse
  ) {
    const session = await getSession(protectedReq, protectedRes);
    if (!session?.user) {
      protectedRes.status(401).json({ error: "Not authenticated" });
      return;
    }

    const signupRole = getSignupIntentRole(protectedReq);
    const dbUser = await ensureDbUser(session.user, signupRole);
    const listingId = protectedReq.query.listingId as string;
    const otherUserId = protectedReq.query.otherUserId as string | undefined;

    if (!listingId) {
      protectedRes.status(400).json({ error: "listingId required" });
      return;
    }

    const where = otherUserId
      ? {
          listingId,
          OR: [
            { senderId: dbUser.id, recipientId: otherUserId },
            { senderId: otherUserId, recipientId: dbUser.id }
          ]
        }
      : {
          listingId,
          OR: [{ senderId: dbUser.id }, { recipientId: dbUser.id }]
        };

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    protectedRes.status(200).json(messages);
  })(req, res);
}
