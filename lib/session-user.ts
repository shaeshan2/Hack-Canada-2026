import { Role } from "@prisma/client";
import { prisma } from "./prisma";

type SessionUser = {
  sub?: string;
  email?: string;
  name?: string;
};

export async function ensureDbUser(user: SessionUser, initialRole?: Role) {
  if (!user.sub || !user.email) {
    throw new Error("Authenticated user is missing required claims");
  }

  return prisma.user.upsert({
    where: { auth0Id: user.sub },
    create: {
      auth0Id: user.sub,
      email: user.email,
      name: user.name,
      role: initialRole ?? Role.BUYER
    },
    update: {
      email: user.email,
      name: user.name
    }
  });
}
