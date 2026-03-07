import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

/**
 * GET /api/listings/[id]
 * Returns a single listing by id with seller info.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: "Listing id required" });
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  res.status(200).json(listing);
}
