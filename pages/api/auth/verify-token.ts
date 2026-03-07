import type { NextApiRequest, NextApiResponse } from "next";
import "../../../lib/auth0-env";
import { getSession } from "@auth0/nextjs-auth0";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { ensureDbUser } from "../../../lib/session-user";
import { getSignupIntentRole } from "../../../lib/signup-intent";

/**
 * POST /api/auth/verify-token
 * Verifies Auth0 JWT (Bearer token) and returns user id + role.
 * Falls back to cookie session for browser clients.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const issuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL;
    const auth0Domain = process.env.AUTH0_DOMAIN;
    const rawIssuer = issuerBaseUrl ?? (auth0Domain ? `https://${auth0Domain}` : undefined);
    const issuer = rawIssuer?.replace(/\/+$/, "");

    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;

    if (bearerToken) {
      if (!issuer) {
        res.status(500).json({ error: "Missing Auth0 issuer configuration", authenticated: false, role: null, userId: null });
        return;
      }

      const audience = process.env.AUTH0_AUDIENCE ?? process.env.AUTH0_CLIENT_ID;
      if (!audience) {
        res.status(500).json({ error: "Missing Auth0 audience/client configuration", authenticated: false, role: null, userId: null });
        return;
      }

      const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
      const { payload } = await jwtVerify(bearerToken, jwks, {
        issuer: `${issuer}/`,
        audience
      });

      const jwtUser = payload as JWTPayload & {
        email?: string;
        name?: string;
      };
      if (!jwtUser.sub) {
        res.status(401).json({ error: "JWT missing subject", authenticated: false, role: null, userId: null });
        return;
      }
      if (!jwtUser.email) {
        res.status(401).json({ error: "JWT missing email claim", authenticated: false, role: null, userId: null });
        return;
      }

      const dbUser = await ensureDbUser({
        sub: jwtUser.sub,
        email: jwtUser.email,
        name: jwtUser.name
      });

      res.status(200).json({
        authenticated: true,
        userId: dbUser.id,
        role: dbUser.role
      });
      return;
    }

    // Browser fallback (session cookie)
    const session = await getSession(req, res);
    if (!session?.user?.sub || !session?.user?.email) {
      res.status(200).json({ authenticated: false, role: null, userId: null });
      return;
    }

    const signupRole = getSignupIntentRole(req);
    const dbUser = await ensureDbUser(session.user, signupRole);
    res.status(200).json({ authenticated: true, userId: dbUser.id, role: dbUser.role });
  } catch (err) {
    console.error("verify-token error:", err);
    res.status(401).json({ error: "Verification failed", authenticated: false, role: null, userId: null });
  }
}
