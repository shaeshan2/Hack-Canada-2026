import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { runFraudCheck } from "../../lib/api/fraud-check";
import { sendError, sendNotFound, sendValidation } from "../../lib/api/errors";

const schema = z.object({
  listingId: z.string().min(1, "listingId is required")
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat().join(" ") || "Invalid payload";
    sendValidation(res, msg);
    return;
  }

  try {
    const result = await runFraudCheck(parsed.data.listingId);
    res.status(200).json({
      listingId: parsed.data.listingId,
      confidenceScore: result.confidenceScore,
      badge: result.badge,
      breakdown: result.breakdown,
      matchedImages: result.matchedImages,
      flags: result.flags
    });
  } catch (err) {
    if ((err as Error).message === "Listing not found") {
      sendNotFound(res, "Listing");
      return;
    }
    sendError(res, "Fraud check failed", "INTERNAL_ERROR", 500);
  }
}
