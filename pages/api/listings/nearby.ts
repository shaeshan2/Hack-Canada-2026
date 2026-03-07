import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

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

/**
 * GET /api/listings/nearby
 * Query: lat, lng, radius_km, price_min, price_max, bedrooms
 * Returns listings within radius (using lat/lng when present) and optional filters.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radius_km) || 10;
  const priceMin = req.query.price_min != null ? Number(req.query.price_min) : undefined;
  const priceMax = req.query.price_max != null ? Number(req.query.price_max) : undefined;
  const bedrooms = req.query.bedrooms != null ? Number(req.query.bedrooms) : undefined;

  const where: { price?: { gte?: number; lte?: number }; bedrooms?: number } = {};
  if (priceMin != null && !Number.isNaN(priceMin)) where.price = { ...where.price, gte: priceMin };
  if (priceMax != null && !Number.isNaN(priceMax)) where.price = { ...where.price, lte: priceMax };
  if (bedrooms != null && !Number.isNaN(bedrooms)) where.bedrooms = bedrooms;

  const listings = await prisma.listing.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: {
      seller: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  let result = listings;
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    result = listings.filter((l) => {
      if (l.latitude == null || l.longitude == null) return true;
      return haversineKm(lat, lng, l.latitude, l.longitude) <= radiusKm;
    });
  }

  res.status(200).json(result);
}
