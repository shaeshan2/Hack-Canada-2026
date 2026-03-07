import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { listingIdParamSchema, parseQuery } from "../../../lib/api/validation";
import { sendError, sendNotFound } from "../../../lib/api/errors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendError(res, "Method not allowed", "BAD_REQUEST", 405);
    return;
  }

  const parsed = parseQuery(listingIdParamSchema, { id: req.query.id });
  if (!parsed.success) {
    sendError(res, parsed.error, "VALIDATION_ERROR", 422);
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.id },
    include: {
      seller: { select: { id: true, name: true } },
      photos: { orderBy: { order: "asc" } },
    },
  });

  if (!listing) {
    sendNotFound(res, "Listing");
    return;
  }

  res.status(200).json(listing);
}
