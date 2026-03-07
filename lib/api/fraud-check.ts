import { prisma } from "../prisma";

/**
 * Runs fraud checks (currently mock) and updates listing.confidenceScore.
 * Returns the updated score and badge. Call after listing create or on demand.
 */
export async function runFraudCheck(listingId: string): Promise<{
  confidenceScore: number;
  badge: "verified" | "pending" | "low";
  breakdown: Record<string, number>;
}> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    throw new Error("Listing not found");
  }

  // Mock weighted score (Task 2 will replace with real imagehash, EXIF, etc.)
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
  const badge = clamped >= 85 ? "verified" : clamped >= 60 ? "pending" : "low";

  await prisma.listing.update({
    where: { id: listingId },
    data: { confidenceScore: clamped },
  });

  return {
    confidenceScore: clamped,
    badge,
    breakdown: {
      perceptualHash,
      reverseImage,
      exifMatch,
      priceSanity,
      addressValid,
    },
  };
}
