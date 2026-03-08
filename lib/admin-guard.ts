import type { NextApiRequest, NextApiResponse } from "next";
import { Role } from "@prisma/client";
import { decodeJwt } from "jose";
import { auth0 } from "./auth0";
import { ensureDbUser } from "./session-user";
import { getSignupIntentRole } from "./signup-intent";
import { hasAuth0AdminRole } from "./auth0-roles";
import { prisma } from "./prisma";

export async function requireAdminUser(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  let session: Awaited<ReturnType<typeof auth0.getSession>>;
  try {
    session = await auth0.getSession(req);
  } catch {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  if (!session?.user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  const signupRole = getSignupIntentRole(req);
  const dbUser = await ensureDbUser(session.user, signupRole);
  const auth0Admin = hasAuth0AdminRole(session.user as Record<string, unknown>);

  // Require admin:review permission in the access token when AUTH0_AUDIENCE is set
  let hasAdminScope = true;
  if (process.env.AUTH0_AUDIENCE) {
    const accessToken = session.tokenSet?.accessToken;
    if (accessToken) {
      try {
        const claims = decodeJwt(accessToken);
        const permissions = Array.isArray(claims.permissions)
          ? (claims.permissions as string[])
          : [];
        hasAdminScope = permissions.includes("admin:review");
      } catch {
        hasAdminScope = false;
      }
    } else {
      hasAdminScope = false;
    }
  }

  if (!auth0Admin || !hasAdminScope) {
    res.status(403).json({ error: "Admin role required" });
    return null;
  }

  // Keep DB role in sync if Auth0 says admin but DB disagrees
  if (dbUser.role !== Role.ADMIN) {
    return prisma.user.update({
      where: { id: dbUser.id },
      data: { role: Role.ADMIN },
    });
  }

  return dbUser;
}

/**
 * HOF that wraps an admin-only API route with auth error handling.
 * Catches malformed/tampered session cookies that would otherwise produce 500s.
 */
export function withAdminRequired(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  // Wrap the whole withApiAuthRequired result so we can catch its own throws
  // (e.g. cookie decryption errors from tampered sessions)
  const protected_ = auth0.withApiAuthRequired(handler);
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await protected_(req, res);
    } catch {
      res.status(401).json({ error: "Not authenticated" });
    }
  };
}
