import type { NextApiRequest, NextApiResponse } from "next";
import "../../../../lib/auth0-env";
import { auth0 } from "../../../../lib/auth0";
import { prisma } from "../../../../lib/prisma";
import { ensureDbUser } from "../../../../lib/session-user";
import { getSignupIntentRole } from "../../../../lib/signup-intent";
import { sendError } from "../../../../lib/api/errors";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        sendError(res, "Method not allowed", "BAD_REQUEST", 405);
        return;
    }

    return auth0.withApiAuthRequired(async function getSavedListings(
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

        const saved = await prisma.savedListing.findMany({
            where: { userId: dbUser.id },
            include: {
                listing: {
                    include: {
                        seller: { select: { id: true, name: true, role: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Map it to look like normal listings
        const mapped = saved.map((s: any) => s.listing);

        protectedRes.status(200).json(mapped);
    })(req, res);
}
