import type { NextApiRequest, NextApiResponse } from "next";
import "../../../lib/auth0-env";
import { auth0 } from "../../../lib/auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";
import { messagesQuerySchema, parseQuery } from "../../../lib/api/validation";
import { sendError, sendValidation } from "../../../lib/api/errors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "PATCH") {
    return auth0.withApiAuthRequired(async function markRead(
      protectedReq: NextApiRequest,
      protectedRes: NextApiResponse,
    ) {
      const session = await auth0.getSession(protectedReq);
      if (!session?.user) {
        sendError(protectedRes, "Not authenticated", "UNAUTHORIZED", 401);
        return;
      }
      const signupRole = getSignupIntentRole(protectedReq);
      const dbUser = await ensureDbUser(session.user, signupRole);
      const { listingId, otherUserId } = protectedReq.body as {
        listingId?: string;
        otherUserId?: string;
      };
      if (!listingId || !otherUserId) {
        sendError(
          protectedRes,
          "listingId and otherUserId required",
          "BAD_REQUEST",
          400,
        );
        return;
      }
      await prisma.message.updateMany({
        where: {
          listingId,
          senderId: otherUserId,
          recipientId: dbUser.id,
          read: false,
        },
        data: { read: true },
      });
      protectedRes.status(200).json({ ok: true });
    })(req, res);
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, PATCH");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  return auth0.withApiAuthRequired(async function getMessages(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse,
  ) {
    const session = await auth0.getSession(protectedReq);
    if (!session?.user) {
      sendError(protectedRes, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const signupRole = getSignupIntentRole(protectedReq);
    const dbUser = await ensureDbUser(session.user, signupRole);

    const parsed = parseQuery(messagesQuerySchema, protectedReq.query);
    if (!parsed.success) {
      sendValidation(protectedRes, parsed.error);
      return;
    }
    const { listingId, otherUserId } = parsed.data;

    const where = otherUserId
      ? {
          listingId,
          OR: [
            { senderId: dbUser.id, recipientId: otherUserId },
            { senderId: otherUserId, recipientId: dbUser.id },
          ],
        }
      : {
          listingId,
          OR: [{ senderId: dbUser.id }, { recipientId: dbUser.id }],
        };

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    protectedRes.status(200).json(messages);
  })(req, res);
}
