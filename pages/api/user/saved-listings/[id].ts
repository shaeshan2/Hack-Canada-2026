import type { NextApiRequest, NextApiResponse } from "next";
import "../../../../lib/auth0-env";
import { auth0 } from "../../../../lib/auth0";
import { prisma } from "../../../../lib/prisma";
import { ensureDbUser } from "../../../../lib/session-user";
import { getSignupIntentRole } from "../../../../lib/signup-intent";
import { sendError, sendNotFound } from "../../../../lib/api/errors";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST" && req.method !== "DELETE") {
        res.setHeader("Allow", "POST, DELETE");
        sendError(res, "Method not allowed", "BAD_REQUEST", 405);
        return;
    }

    return auth0.withApiAuthRequired(async function saveListing(
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
        const listingId = protectedReq.query.id as string;

        if (!listingId) {
            sendError(protectedRes, "Missing listing ID", "BAD_REQUEST", 400);
            return;
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            sendNotFound(protectedRes, "Listing");
            return;
        }

        try {
            if (req.method === "POST") {
                await prisma.savedListing.upsert({
                    where: {
                        userId_listingId: {
                            userId: dbUser.id,
                            listingId,
                        },
                    },
                    update: {},
                    create: {
                        userId: dbUser.id,
                        listingId,
                    },
                });
                protectedRes.status(200).json({ ok: true });
            } else if (req.method === "DELETE") {
                await prisma.savedListing.deleteMany({
                    where: {
                        userId: dbUser.id,
                        listingId,
                    },
                });
                protectedRes.status(200).json({ ok: true });
            }
        } catch (err) {
            console.error("[SavedListings API Error]", err);
            sendError(protectedRes, "Database Error", "SERVER_ERROR" as any, 500);
        }
    })(req, res);
}
