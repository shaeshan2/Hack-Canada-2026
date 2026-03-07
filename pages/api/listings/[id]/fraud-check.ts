import type { NextApiRequest, NextApiResponse } from "next";
import { listingIdParamSchema, parseQuery } from "../../../../lib/api/validation";
import { sendError, sendNotFound } from "../../../../lib/api/errors";
import { runFraudCheck } from "../../../../lib/api/fraud-check";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  const parsed = parseQuery(listingIdParamSchema, { id: req.query.id });
  if (!parsed.success) {
    sendError(res, parsed.error, "VALIDATION_ERROR", 422);
    return;
  }

  try {
    const result = await runFraudCheck(parsed.data.id);
    res.status(200).json({
      listingId: parsed.data.id,
      confidenceScore: result.confidenceScore,
      badge: result.badge,
      breakdown: result.breakdown,
    });
  } catch (err) {
    if ((err as Error).message === "Listing not found") {
      sendNotFound(res, "Listing");
      return;
    }
    sendError(res, "Fraud check failed", "INTERNAL_ERROR", 500);
  }
}
