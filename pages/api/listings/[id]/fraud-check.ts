import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../lib/prisma";

/**
 * POST /api/listings/[id]/fraud-check
 * Runs fraud checks (mock) and updates listing confidenceScore.
 * Real implementation would use imagehash, Vision API, EXIF, Canada Post, Gemini.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: "Listing id required" });
    return;
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  // Mock weighted score: perceptual hash 25%, reverse image 20%, EXIF 20%, price 20%, address 15%
  const perceptualHash = 90;
  const reverseImage = 85;
  const exifMatch = 95;
  const priceSanity = 88;
  const addressValid = 100;
  const score = Math.round(
    perceptualHash * 0.25 +
    reverseImage * 0.2 +
    exifMatch * 0.2 +
    priceSanity * 0.2 +
    addressValid * 0.15
  );
  const clamped = Math.min(100, Math.max(0, score));

  await prisma.listing.update({
    where: { id },
    data: { confidenceScore: clamped }
  });

  const badge =
    clamped >= 85 ? "verified" : clamped >= 60 ? "pending" : "low";

  res.status(200).json({
    listingId: id,
    confidenceScore: clamped,
    badge,
    breakdown: {
      perceptualHash,
      reverseImage,
      exifMatch,
      priceSanity,
      addressValid
    }
  });
}
