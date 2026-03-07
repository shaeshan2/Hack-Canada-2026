import type { NextApiRequest, NextApiResponse } from "next";
import "../../../lib/auth0-env";
import { Role } from "@prisma/client";
import { auth0 } from "../../../lib/auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";
import { createMessageSchema, parseBody } from "../../../lib/api/validation";
import {
  sendError,
  sendNotFound,
  sendValidation,
} from "../../../lib/api/errors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  return auth0.withApiAuthRequired(async function createMessage(
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

    const parsed = parseBody(createMessageSchema, protectedReq.body);
    if (!parsed.success) {
      sendValidation(protectedRes, parsed.error);
      return;
    }
    const { recipientId, listingId, content } = parsed.data;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { sellerId: true },
    });
    if (!listing) {
      sendNotFound(protectedRes, "Listing");
      return;
    }

    if (dbUser.role === Role.BUYER) {
      // Buyers can only message the listing's seller
      if (recipientId !== listing.sellerId) {
        sendError(
          protectedRes,
          "Messages must target the listing seller",
          "BAD_REQUEST",
          400,
        );
        return;
      }
    } else if (dbUser.role === Role.SELLER_VERIFIED || dbUser.role === Role.SELLER_PENDING) {
      // Sellers can only reply on their own listings
      if (listing.sellerId !== dbUser.id) {
        sendError(
          protectedRes,
          "You can only message about your own listings",
          "FORBIDDEN",
          403,
        );
        return;
      }
    } else if (dbUser.role !== Role.ADMIN) {
      sendError(protectedRes, "Unauthorized", "FORBIDDEN", 403);
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId: dbUser.id,
        recipientId,
        listingId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    });

    protectedRes.status(201).json(message);
  })(req, res);
}
