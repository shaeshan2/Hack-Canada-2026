import * as fs from "node:fs/promises";
import * as path from "node:path";
import { FraudFlagStatus } from "@prisma/client";
import exifr from "exifr";
import Jimp from "jimp";
import { prisma } from "../prisma";

type ScoreBreakdown = {
  perceptualHash: number;
  reverseImage: number;
  exifMatch: number;
  priceSanity: number;
  addressValid: number;
};

type FraudResult = {
  confidenceScore: number;
  badge: "verified" | "pending" | "low";
  breakdown: ScoreBreakdown;
  matchedImages: string[];
  flags: string[];
};

const WEIGHTS: ScoreBreakdown = {
  perceptualHash: 25,
  reverseImage: 20,
  exifMatch: 20,
  priceSanity: 20,
  addressValid: 15
};

function photoUrlToLocalPath(url: string): string | null {
  if (!url.startsWith("/")) return null;
  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

async function readPhotoBuffer(url: string): Promise<Buffer | null> {
  const local = photoUrlToLocalPath(url);
  if (local) {
    try {
      return await fs.readFile(local);
    } catch {
      return null;
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arr = await resp.arrayBuffer();
      return Buffer.from(arr);
    } catch {
      return null;
    }
  }

  return null;
}

async function averageHash(buffer: Buffer): Promise<string | null> {
  try {
    const image = await Jimp.read(buffer);
    image.resize({ w: 8, h: 8 }).grayscale();

    const luminances: number[] = [];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const { r, g, b } = Jimp.intToRGBA(image.getPixelColor(x, y));
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        luminances.push(luma);
      }
    }

    const avg = luminances.reduce((sum, n) => sum + n, 0) / luminances.length;
    return luminances.map((n) => (n >= avg ? "1" : "0")).join("");
  } catch {
    return null;
  }
}

function hashSimilarityPercent(a: string, b: string): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let same = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) same += 1;
  }
  return (same / a.length) * 100;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function checkPerceptualHash(listingId: string, currentUrls: string[]) {
  const allOther = await prisma.listing.findMany({
    where: { id: { not: listingId } },
    select: {
      imageUrl: true,
      photos: { select: { url: true } }
    }
  });

  const currentBuffers = await Promise.all(currentUrls.map((u) => readPhotoBuffer(u)));
  const currentHashes = (
    await Promise.all(currentBuffers.filter((b): b is Buffer => !!b).map((b) => averageHash(b)))
  ).filter((h): h is string => !!h);

  const candidateUrls = allOther.flatMap((l) => [l.imageUrl, ...l.photos.map((p) => p.url)].filter((v): v is string => !!v));
  const candidateBuffers = await Promise.all(candidateUrls.map((u) => readPhotoBuffer(u)));
  const candidateHashes = await Promise.all(
    candidateBuffers.map(async (b, i) => {
      if (!b) return null;
      const hash = await averageHash(b);
      if (!hash) return null;
      return { hash, url: candidateUrls[i] };
    })
  );

  if (currentHashes.length === 0 || candidateHashes.filter(Boolean).length === 0) {
    return { score: 80, matchedImages: [] as string[], flags: [] as string[] };
  }

  let maxSimilarity = 0;
  const matchedImages = new Set<string>();

  for (const cHash of currentHashes) {
    for (const target of candidateHashes) {
      if (!target) continue;
      const similarity = hashSimilarityPercent(cHash, target.hash);
      if (similarity > maxSimilarity) maxSimilarity = similarity;
      if (similarity > 95) matchedImages.add(target.url);
    }
  }

  const matched = [...matchedImages];
  if (maxSimilarity > 95) {
    return {
      score: 20,
      matchedImages: matched,
      flags: [`Perceptual hash similarity ${maxSimilarity.toFixed(1)}% (>95%)`]
    };
  }
  if (maxSimilarity > 90) {
    return {
      score: 60,
      matchedImages: matched,
      flags: [`Perceptual hash similarity ${maxSimilarity.toFixed(1)}% (>90%)`]
    };
  }

  return { score: 95, matchedImages: matched, flags: [] as string[] };
}

async function checkReverseImage(currentUrls: string[]) {
  const imageUrl = currentUrls.find((u) => u.startsWith("http://") || u.startsWith("https://"));
  if (!imageUrl) {
    return { score: 80, flags: [] as string[] };
  }

  const googleKey = process.env.GOOGLE_VISION_API_KEY;
  if (googleKey) {
    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${googleKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { source: { imageUri: imageUrl } },
                features: [{ type: "WEB_DETECTION", maxResults: 10 }]
              }
            ]
          })
        }
      );

      if (response.ok) {
        const data = (await response.json()) as {
          responses?: Array<{ webDetection?: { pagesWithMatchingImages?: unknown[] } }>;
        };
        const matches = data.responses?.[0]?.webDetection?.pagesWithMatchingImages?.length ?? 0;
        if (matches > 0) {
          return { score: 30, flags: [`Reverse image found ${matches} web matches`] };
        }
        return { score: 90, flags: [] as string[] };
      }
    } catch {
      // continue to fallback
    }
  }

  const tineyeUrl = process.env.TINEYE_API_URL;
  if (tineyeUrl) {
    return { score: 70, flags: ["TinEye endpoint configured but parser not implemented"] };
  }

  return { score: 80, flags: [] as string[] };
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: {
          "User-Agent": "DeedScan/1.0"
        }
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function checkExifGps(currentUrls: string[], address: string, listingLat: number | null, listingLng: number | null) {
  const target =
    listingLat != null && listingLng != null
      ? { lat: listingLat, lng: listingLng }
      : await geocodeAddress(address);

  if (!target) {
    return { score: 80, flags: [] as string[] };
  }

  let minDistance: number | null = null;

  for (const url of currentUrls) {
    const buffer = await readPhotoBuffer(url);
    if (!buffer) continue;

    try {
      const gps = await exifr.gps(buffer);
      const lat = Number((gps as { latitude?: unknown })?.latitude ?? NaN);
      const lng = Number((gps as { longitude?: unknown })?.longitude ?? NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const km = haversineKm(lat, lng, target.lat, target.lng);
      minDistance = minDistance == null ? km : Math.min(minDistance, km);
    } catch {
      // skip exif parse errors
    }
  }

  if (minDistance == null) {
    return { score: 80, flags: [] as string[] };
  }

  if (minDistance > 1) {
    return {
      score: 25,
      flags: [`EXIF GPS differs by ${minDistance.toFixed(2)} km (>1km)`]
    };
  }

  return { score: 95, flags: [] as string[] };
}

async function checkPriceSanity(address: string, price: number) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { score: 80, flags: [] as string[] };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Is $${price.toLocaleString("en-CA")} reasonable for ${address}? Reply JSON only: {"score": 0-100, "reason": "..."}`
                }
              ]
            }
          ],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) {
      return { score: 75, flags: ["Price sanity unavailable (Gemini API error)"] };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { score: 75, flags: ["Price sanity unavailable (Gemini empty)"] };
    }

    const parsed = JSON.parse(text) as { score?: number; reason?: string };
    const score = Math.max(0, Math.min(100, Number(parsed.score ?? 75)));
    const flags = score < 50 && parsed.reason ? [`Price sanity flag: ${parsed.reason}`] : [];
    return { score, flags };
  } catch {
    return { score: 75, flags: ["Price sanity check failed"] };
  }
}

async function checkAddressVerification(address: string) {
  const key = process.env.CANADA_POST_API_KEY;
  if (!key) {
    return { score: 80, flags: [] as string[] };
  }

  try {
    const url =
      `https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3ex.ws` +
      `?Key=${encodeURIComponent(key)}&SearchTerm=${encodeURIComponent(address)}&Country=CAN`;

    const response = await fetch(url);
    if (!response.ok) {
      return { score: 70, flags: ["Address verification unavailable (Canada Post API error)"] };
    }

    const data = (await response.json()) as { Items?: Array<{ Text?: string; Description?: string }> };
    const items = data.Items ?? [];
    if (items.length === 0) {
      return { score: 40, flags: ["Address not found in Canada Post AddressComplete"] };
    }

    const normalizedAddress = address.toLowerCase();
    const exact = items.some((i) => `${i.Text ?? ""} ${i.Description ?? ""}`.toLowerCase().includes(normalizedAddress));
    return { score: exact ? 95 : 75, flags: exact ? [] : ["Address matched approximately"] };
  } catch {
    return { score: 70, flags: ["Address verification failed"] };
  }
}

function weightedConfidence(b: ScoreBreakdown): number {
  const weighted =
    (b.perceptualHash * WEIGHTS.perceptualHash +
      b.reverseImage * WEIGHTS.reverseImage +
      b.exifMatch * WEIGHTS.exifMatch +
      b.priceSanity * WEIGHTS.priceSanity +
      b.addressValid * WEIGHTS.addressValid) /
    100;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

export async function runFraudCheck(listingId: string): Promise<FraudResult> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { photos: { orderBy: { order: "asc" } } }
  });
  if (!listing) {
    throw new Error("Listing not found");
  }

  const currentUrls = [listing.imageUrl, ...listing.photos.map((p) => p.url)].filter(
    (v): v is string => !!v
  );

  const [perceptual, reverseImage, exif, price, address] = await Promise.all([
    checkPerceptualHash(listing.id, currentUrls),
    checkReverseImage(currentUrls),
    checkExifGps(currentUrls, listing.address, listing.latitude, listing.longitude),
    checkPriceSanity(listing.address, listing.price),
    checkAddressVerification(listing.address)
  ]);

  const breakdown: ScoreBreakdown = {
    perceptualHash: perceptual.score,
    reverseImage: reverseImage.score,
    exifMatch: exif.score,
    priceSanity: price.score,
    addressValid: address.score
  };

  const confidenceScore = weightedConfidence(breakdown);
  const badge = confidenceScore >= 85 ? "verified" : confidenceScore >= 60 ? "pending" : "low";
  const flags = [...perceptual.flags, ...reverseImage.flags, ...exif.flags, ...price.flags, ...address.flags];

  await prisma.listing.update({
    where: { id: listingId },
    data: { confidenceScore }
  });

  if (confidenceScore < 60 || flags.length > 0) {
    await prisma.fraudFlag.upsert({
      where: { listingId },
      create: {
        listingId,
        status: FraudFlagStatus.PENDING_REVIEW,
        confidenceScore,
        breakdownJson: JSON.stringify(breakdown),
        matchedImagesJson: JSON.stringify(perceptual.matchedImages),
        notes: flags.join("; ") || null
      },
      update: {
        status: FraudFlagStatus.PENDING_REVIEW,
        confidenceScore,
        breakdownJson: JSON.stringify(breakdown),
        matchedImagesJson: JSON.stringify(perceptual.matchedImages),
        notes: flags.join("; ") || null,
        reviewedAt: null,
        reviewedById: null
      }
    });
  }

  return {
    confidenceScore,
    badge,
    breakdown,
    matchedImages: perceptual.matchedImages,
    flags
  };
}
