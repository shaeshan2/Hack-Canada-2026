import type { NextApiRequest, NextApiResponse } from "next";
import "../../../../lib/auth0-env";
import { FraudFlagStatus, VerificationStatus } from "@prisma/client";
import { auth0 } from "../../../../lib/auth0";
import { prisma } from "../../../../lib/prisma";
import { requireAdminUser } from "../../../../lib/admin-guard";

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default auth0.withApiAuthRequired(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const adminUser = await requireAdminUser(req, res);
  if (!adminUser) return;

  const [pendingSellers, flaggedListings] = await Promise.all([
    prisma.sellerVerificationSubmission.findMany({
      // Return recent submissions across all statuses; client applies filters.
      orderBy: { submittedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            auth0Id: true
          }
        }
      }
    }),
    prisma.fraudFlag.findMany({
      // Return recent fraud flags across all statuses; client applies filters.
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                name: true,
                auth0Id: true,
                role: true,
                blockedReason: true
              }
            }
          }
        }
      }
    })
  ]);

  res.status(200).json({
    pendingSellers,
    flaggedListings: flaggedListings.map((flag) => ({
      ...flag,
      breakdown: parseJson<Record<string, number>>(flag.breakdownJson),
      matchedImages: parseJson<string[]>(flag.matchedImagesJson)
    }))
  });
});
