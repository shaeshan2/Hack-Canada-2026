import type { NextApiRequest, NextApiResponse } from "next";

export default function signupBuyer(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    "signup_intent=buyer; Path=/; HttpOnly; SameSite=Lax; Max-Age=900"
  );
  res.redirect("/api/auth/login?screen_hint=signup");
}
