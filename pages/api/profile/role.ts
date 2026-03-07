import { Role } from "@prisma/client";
import "../../../lib/auth0-env";
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureDbUser } from "../../../lib/session-user";
import { prisma } from "../../../lib/prisma";
import { getSignupIntentRole } from "../../../lib/signup-intent";

export default withApiAuthRequired(async function setRole(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await getSession(req, res);
  if (!session?.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { role } = req.body ?? {};
  if (!Object.values(Role).includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  if (role === Role.SELLER_VERIFIED || role === Role.ADMIN) {
    res.status(403).json({ error: "This role can only be set by admin workflows" });
    return;
  }

  const signupRole = getSignupIntentRole(req);
  const user = await ensureDbUser(session.user, signupRole);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role }
  });

  res.status(200).json({ id: updated.id, role: updated.role });
});
