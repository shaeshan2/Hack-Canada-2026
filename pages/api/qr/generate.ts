import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";
import { prisma } from "../../../lib/prisma";
import { config } from "../../../lib/config";
import { qrGenerateSchema, parseBody } from "../../../lib/api/validation";
import { sendError, sendNotFound } from "../../../lib/api/errors";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  const body = req.body ?? {};
  const query = req.query ?? {};
  const listingId = body.listingId ?? query.listingId;
  const parsed = parseBody(qrGenerateSchema, { listingId });
  if (!parsed.success) {
    sendError(res, parsed.error, "VALIDATION_ERROR", 422);
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
    select: { id: true },
  });
  if (!listing) {
    sendNotFound(res, "Listing");
    return;
  }

  const url = `${config.app.appClipUrl}?id=${encodeURIComponent(parsed.data.listingId)}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    type: "image/png",
    width: 400,
    margin: 2,
  });

  res.status(200).json({ qrDataUrl, url });
}
