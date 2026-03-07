import type { NextApiRequest, NextApiResponse } from "next";
import "../../../../../lib/auth0-env";
import { BlockedReason, FraudFlagStatus } from "@prisma/client";
import { auth0 } from "../../../../../lib/auth0";
import { prisma } from "../../../../../lib/prisma";
import { requireAdminUser } from "../../../../../lib/admin-guard";
import { blockAuth0User } from "../../../../../lib/auth0-management";

export default auth0.withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const adminUser = await requireAdminUser(req, res);
  if (!adminUser) return;

  const flagId = req.query.flagId as string;
  const { decision, notes } = req.body ?? {};

  if (decision !== "approve" && decision !== "ban") {
    res.status(400).json({ error: "decision must be 'approve' or 'ban'" });
    return;
  }

  const flag = await prisma.fraudFlag.findUnique({
    where: { id: flagId },
    include: {
      listing: {
        include: {
          seller: true,
        },
      },
    },
  });

  if (!flag) {
    res.status(404).json({ error: "Fraud flag not found" });
    return;
  }

  const reviewedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updatedFlag = await tx.fraudFlag.update({
      where: { id: flag.id },
      data: {
        status:
          decision === "approve"
            ? FraudFlagStatus.APPROVED
            : FraudFlagStatus.BANNED,
        notes: notes ? String(notes) : null,
        reviewedAt,
        reviewedById: adminUser.id,
      },
    });

    let seller = flag.listing.seller;
    if (decision === "ban") {
      seller = await tx.user.update({
        where: { id: flag.listing.sellerId },
        data: {
          blockedReason: BlockedReason.FRAUD,
        },
      });
    }

    return { updatedFlag, seller };
  });

  let auth0BlockStatus: { applied?: boolean; reason?: string } = {};
  if (decision === "ban") {
    try {
      auth0BlockStatus = await blockAuth0User(result.seller.auth0Id);
    } catch (error) {
      auth0BlockStatus = { reason: (error as Error).message };
      console.warn("[flags] Auth0 block failed:", error);
    }
  }

  res
    .status(200)
    .json({
      flag: result.updatedFlag,
      seller: result.seller,
      auth0BlockStatus,
    });
});
