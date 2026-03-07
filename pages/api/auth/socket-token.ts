import type { NextApiRequest, NextApiResponse } from "next";
import "../../../lib/auth0-env";
import { getSession } from "@auth0/nextjs-auth0";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await getSession(req, res);
  if (!session?.user?.sub || !session?.user?.email) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const signupRole = getSignupIntentRole(req);
  const dbUser = await ensureDbUser(session.user, signupRole);

  const token =
    (session as unknown as { idToken?: string; accessToken?: string }).idToken ??
    (session as unknown as { idToken?: string; accessToken?: string }).accessToken;
  if (!token) {
    res.status(401).json({ error: "No Auth0 JWT in session", authenticated: false });
    return;
  }

  res.status(200).json({
    authenticated: true,
    token,
    userId: dbUser.id,
    role: dbUser.role
  });
}
