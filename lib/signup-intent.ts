import { Role } from "@prisma/client";
import type { IncomingMessage, ServerResponse } from "http";

const COOKIE_NAME = "signup_intent";

function parseCookies(req: IncomingMessage): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};

  return raw.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [key, ...rest] = chunk.trim().split("=");
    if (!key || rest.length === 0) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function getSignupIntentRole(req: IncomingMessage): Role | undefined {
  const intent = parseCookies(req)[COOKIE_NAME];
  if (intent === "buyer") return Role.BUYER;
  if (intent === "seller") return Role.SELLER_PENDING;
  return undefined;
}

export function clearSignupIntentCookie(res: ServerResponse) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}
