import { Role } from "@prisma/client";
import "../../../lib/auth0-env";
import type { NextApiRequest, NextApiResponse } from "next";
import { auth0 } from "../../../lib/auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";
import { createListingSchema, parseBody } from "../../../lib/api/validation";
import { sendError, sendValidation } from "../../../lib/api/errors";
import { runFraudCheck } from "../../../lib/api/fraud-check";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // Check if there's a logged-in user to fetch their saved items
    const session = await auth0.getSession(req);
    let savedListingIds = new Set<string>();

    if (session?.user) {
      const signupRole = getSignupIntentRole(req);
      const dbUser = await ensureDbUser(session.user, signupRole);
      const saved = await prisma.savedListing.findMany({
        where: { userId: dbUser.id },
        select: { listingId: true },
      });
      savedListingIds = new Set(saved.map((s) => s.listingId));
    }

    const listings = await prisma.listing.findMany({
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        photos: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const listingsWithSaved = listings.map((l) => ({
      ...l,
      isSaved: savedListingIds.has(l.id),
    }));

    res.status(200).json(listingsWithSaved);
    return;
  }

  if (req.method === "POST") {
    return auth0.withApiAuthRequired(async function createListing(
      protectedReq: NextApiRequest,
      protectedRes: NextApiResponse,
    ) {
      const session = await auth0.getSession(protectedReq);
      if (!session?.user) {
        sendError(protectedRes, "Not authenticated", "UNAUTHORIZED", 401);
        return;
      }

      const signupRole = getSignupIntentRole(protectedReq);
      const dbUser = await ensureDbUser(session.user, signupRole);
      if (dbUser.role !== Role.SELLER_VERIFIED) {
        sendError(
          protectedRes,
          "Only verified sellers can create listings",
          "FORBIDDEN",
          403,
        );
        return;
      }

      const parsed = parseBody(createListingSchema, protectedReq.body);
      if (!parsed.success) {
        sendValidation(protectedRes, parsed.error);
        return;
      }
      const data = parsed.data;

      const firstPhotoUrl = data.photoUrls?.length
        ? data.photoUrls[0]
        : (data.imageUrl ?? null);

      const listing = await prisma.listing.create({
        data: {
          title: data.title,
          description: data.description,
          address: data.address,
          price: data.price,
          imageUrl: firstPhotoUrl,
          sqft: data.sqft ?? null,
          bedrooms: data.bedrooms ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          sellerId: dbUser.id,
        },
      });

      if (data.photoUrls?.length) {
        await prisma.photo.createMany({
          data: data.photoUrls.map((url, i) => ({
            listingId: listing.id,
            url,
            order: i,
          })),
        });
      }

      // Run fraud-check (stub) and set confidenceScore
      let confidenceScore: number | null = null;
      let badge: "verified" | "pending" | "low" = "pending";
      try {
        const result = await runFraudCheck(listing.id);
        confidenceScore = result.confidenceScore;
        badge = result.badge;
      } catch {
        // keep confidenceScore null if fraud-check fails
      }

      const withPhotos = await prisma.listing.findUnique({
        where: { id: listing.id },
        include: {
          seller: { select: { id: true, name: true } },
          photos: { orderBy: { order: "asc" } },
        },
      });

      protectedRes.status(201).json({
        ...withPhotos,
        confidenceScore: withPhotos?.confidenceScore ?? confidenceScore,
        badge:
          withPhotos?.confidenceScore != null
            ? withPhotos.confidenceScore >= 85
              ? "verified"
              : withPhotos.confidenceScore >= 60
                ? "pending"
                : "low"
            : badge,
      });
    })(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed", code: "BAD_REQUEST" });
}
