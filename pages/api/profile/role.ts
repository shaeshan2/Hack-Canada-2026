import { Role } from "@prisma/client";
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import type { NextApiRequest, NextApiResponse } from "next";
import { ensureDbUser } from "../../../lib/session-user";
import { prisma } from "../../../lib/prisma";

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

  const user = await ensureDbUser(session.user);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role }
  });

  res.status(200).json({ id: updated.id, role: updated.role });
});
