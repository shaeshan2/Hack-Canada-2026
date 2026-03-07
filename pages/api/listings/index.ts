import { Role } from "@prisma/client";
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const listings = await prisma.listing.findMany({
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(listings);
    return;
  }

  if (req.method === "POST") {
    return withApiAuthRequired(async function createListing(
      protectedReq: NextApiRequest,
      protectedRes: NextApiResponse
    ) {
      const session = await getSession(protectedReq, protectedRes);
      if (!session?.user) {
        protectedRes.status(401).json({ error: "Not authenticated" });
        return;
      }

      const dbUser = await ensureDbUser(session.user);
      if (dbUser.role !== Role.SELLER) {
        protectedRes.status(403).json({ error: "Only sellers can create listings" });
        return;
      }

      const { title, description, address, price, imageUrl } = protectedReq.body ?? {};
      if (!title || !description || !address || Number(price) <= 0) {
        protectedRes.status(400).json({ error: "Missing or invalid listing fields" });
        return;
      }

      const listing = await prisma.listing.create({
        data: {
          title: String(title),
          description: String(description),
          address: String(address),
          price: Number(price),
          imageUrl: imageUrl ? String(imageUrl) : null,
          sellerId: dbUser.id
        }
      });

      protectedRes.status(201).json(listing);
    })(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}
