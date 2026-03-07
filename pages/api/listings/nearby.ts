import type { NextApiRequest, NextApiResponse } from "next";
import type { Prisma } from "@prisma/client";
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
  const radius = radius_km ?? 10;

  // Bounding box prefilter for Prisma/SQLite before exact Haversine filtering.
  const latDelta = radius / 111;
  const lngDelta = radius / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  const where: Prisma.ListingWhereInput = {
    latitude: { not: null, gte: lat - latDelta, lte: lat + latDelta },
    longitude: { not: null, gte: lng - lngDelta, lte: lng + lngDelta },
  };
  if (price_min != null || price_max != null) {
    where.price = {
      ...(price_min != null ? { gte: price_min } : {}),
      ...(price_max != null ? { lte: price_max } : {}),
    };
  }
  if (bedrooms != null) {
    where.bedrooms = bedrooms;
  }

  const listings = await prisma.listing.findMany({
    where,
    include: {
      seller: { select: { id: true, name: true, email: true } },
      photos: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = listings
    .map((listing) => {
      const distanceKm = haversineKm(lat, lng, listing.latitude!, listing.longitude!);
      return { listing, distanceKm };
    })
    .filter((item) => item.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map(({ listing, distanceKm }) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      address: listing.address,
      price: listing.price,
      bedrooms: listing.bedrooms,
      sqft: listing.sqft,
      latitude: listing.latitude,
      longitude: listing.longitude,
      imageUrl: listing.imageUrl,
      confidenceScore: listing.confidenceScore,
      distanceKm: Number(distanceKm.toFixed(3)),
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      seller: listing.seller,
      photos: listing.photos,
    }));

  res.status(200).json(result);
}
