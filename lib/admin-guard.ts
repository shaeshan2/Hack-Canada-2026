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
  const session = await auth0.getSession(req);
  if (!session?.user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  const signupRole = getSignupIntentRole(req);
  const dbUser = await ensureDbUser(session.user, signupRole);
  const auth0Admin = hasAuth0AdminRole(session.user as Record<string, unknown>);
  const allowDbFallback = process.env.ALLOW_DB_ADMIN_FALLBACK === "true";

  // Check admin:review scope from access token when a Resource Server audience is configured
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

  const isAdmin =
    (auth0Admin || (allowDbFallback && dbUser.role === Role.ADMIN)) &&
    hasAdminScope;
  if (!isAdmin) {
    res.status(403).json({ error: "Admin role required" });
    return null;
  }

  if (auth0Admin && dbUser.role !== Role.ADMIN) {
    return prisma.user.update({
      where: { id: dbUser.id },
      data: { role: Role.ADMIN },
    });
  }

  return dbUser;
}
