import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../lib/prisma";
import { ensureDbUser } from "../../../lib/session-user";

/**
 * POST /api/auth/verify-token
 * Verifies the current session (cookie) and returns user id + role.
 * Used by frontend/App Clip to check auth state.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const session = await getSession(req, res);
    if (!session?.user?.sub || !session?.user?.email) {
      res.status(200).json({ authenticated: false, role: null, userId: null });
      return;
    }

    const dbUser = await ensureDbUser(session.user);
    res.status(200).json({
      authenticated: true,
      userId: dbUser.id,
      auth0Id: dbUser.auth0Id,
      role: dbUser.role,
      email: dbUser.email,
      name: dbUser.name ?? undefined
    });
  } catch (err) {
    console.error("verify-token error:", err);
    res.status(401).json({ error: "Verification failed", authenticated: false, role: null, userId: null });
  }
}
