import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { type File } from "formidable";
import { Role } from "@prisma/client";
import { auth0 } from "../../../lib/auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";
import { sendError, sendValidation } from "../../../lib/api/errors";
import { storePhoto } from "../../../lib/photo-storage";
import { runFraudCheck } from "../../../lib/api/fraud-check";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const INITIAL_CONFIDENCE_SCORE = 50;

export const config = {
  api: { bodyParser: false }
};

function toSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  return auth0.withApiAuthRequired(async function createListing(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse
  ) {
    const session = await auth0.getSession(protectedReq);
    if (!session?.user) {
      sendError(protectedRes, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const signupRole = getSignupIntentRole(protectedReq);
    const actor = await ensureDbUser(session.user, signupRole);
    const actorIsSeller = actor.role === Role.SELLER_VERIFIED;
    const actorIsAdmin = actor.role === Role.ADMIN;

    if (!actorIsSeller && !actorIsAdmin) {
      sendError(protectedRes, "Only verified sellers or admins can create listings", "FORBIDDEN", 403);
      return;
    }

    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
      keepExtensions: true,
      filter: (part) => !part.mimetype || ALLOWED_TYPES.includes(part.mimetype)
    });

    const [fields, files] = await new Promise<[Record<string, string | string[]>, Record<string, File | File[]>]>((resolve, reject) => {
      form.parse(protectedReq, (err, parsedFields, parsedFiles) => {
        if (err) reject(err);
        else resolve([parsedFields as Record<string, string | string[]>, parsedFiles as Record<string, File | File[]>]);
      });
    });

    const address = toSingle(fields.address)?.trim();
    const priceRaw = toSingle(fields.price);
    const sellerAuth0Id = toSingle(fields.sellerAuth0Id)?.trim();
    const title = toSingle(fields.title)?.trim() || "New Listing";
    const description = toSingle(fields.description)?.trim() || "Submitted via /api/listing/create";

    const price = Number(priceRaw);
    if (!address || !Number.isFinite(price) || price <= 0) {
      sendValidation(protectedRes, "address and positive price are required");
      return;
    }

    let seller = actor;
    if (sellerAuth0Id) {
      const target = await prisma.user.findUnique({ where: { auth0Id: sellerAuth0Id } });
      if (!target) {
        sendValidation(protectedRes, "sellerAuth0Id not found");
        return;
      }

      if (!actorIsAdmin && target.id !== actor.id) {
        sendError(protectedRes, "sellerAuth0Id must match authenticated seller", "FORBIDDEN", 403);
        return;
      }

      if (target.role !== Role.SELLER_VERIFIED && !actorIsAdmin) {
        sendError(protectedRes, "Target seller must be seller_verified", "FORBIDDEN", 403);
        return;
      }
      seller = target;
    }

    if (!actorIsAdmin && seller.role !== Role.SELLER_VERIFIED) {
      sendError(protectedRes, "Only seller_verified accounts can create listings", "FORBIDDEN", 403);
      return;
    }

    const photoField = files.photos;
    const fileList = Array.isArray(photoField) ? photoField : photoField ? [photoField] : [];
    const validFiles = fileList.filter((f): f is File => !!f?.filepath && f.size > 0);

    if (validFiles.length === 0) {
      sendValidation(protectedRes, "At least one photo is required in photos multipart field");
      return;
    }

    const photoUrls: string[] = [];
    for (const file of validFiles) {
      const url = await storePhoto(file.filepath, file.originalFilename || "image.jpg", file.mimetype || null);
      photoUrls.push(url);
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        address,
        price,
        sellerId: seller.id,
        imageUrl: photoUrls[0] ?? null,
        confidenceScore: INITIAL_CONFIDENCE_SCORE
      }
    });

    await prisma.photo.createMany({
      data: photoUrls.map((url, order) => ({ listingId: listing.id, url, order }))
    });

    // Trigger fraud checks asynchronously (non-blocking)
    void runFraudCheck(listing.id).catch((error) => {
      console.error("async fraud check failed for listing", listing.id, error);
    });

    protectedRes.status(201).json({
      listingId: listing.id,
      initialConfidenceScore: INITIAL_CONFIDENCE_SCORE
    });
  })(req, res);
}
