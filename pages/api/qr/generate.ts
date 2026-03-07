import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";
import { prisma } from "../../../lib/prisma";

const APP_CLIP_BASE = process.env.NEXT_PUBLIC_APP_CLIP_URL || "https://deedscan.app/clip";

/**
 * POST /api/qr/generate
 * Body: { listingId: string }
 * Returns: { qrDataUrl: string, url: string }
 * PNG as base64 data URL for easy display/download.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const listingId = (req.body ?? {}).listingId ?? (req.query ?? {}).listingId;
  if (!listingId || typeof listingId !== "string") {
    res.status(400).json({ error: "listingId is required" });
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true }
  });
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const url = `${APP_CLIP_BASE}?id=${encodeURIComponent(listingId)}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    type: "image/png",
    width: 400,
    margin: 2
  });

  res.status(200).json({ qrDataUrl, url });
}
