import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { nearbyQuerySchema, parseQuery } from "../../../lib/api/validation";
import { sendError } from "../../../lib/api/errors";

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  const parsed = parseQuery(nearbyQuerySchema, req.query);
  if (!parsed.success) {
    sendError(res, parsed.error, "VALIDATION_ERROR", 422);
    return;
  }
  const { lat, lng, radius_km, price_min, price_max, bedrooms } = parsed.data;

  const where: { price?: { gte?: number; lte?: number }; bedrooms?: number } = {};
  if (price_min != null) where.price = { ...where.price, gte: price_min };
  if (price_max != null) where.price = { ...where.price, lte: price_max };
  if (bedrooms != null) where.bedrooms = bedrooms;

  const listings = await prisma.listing.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: {
      seller: { select: { id: true, name: true } },
      photos: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  let result = listings;
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    const radius = radius_km ?? 10;
    result = listings.filter((l) => {
      if (l.latitude == null || l.longitude == null) return true;
      return haversineKm(lat, lng, l.latitude, l.longitude) <= radius;
    });
  }

  res.status(200).json(result);
}
