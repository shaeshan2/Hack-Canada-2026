import type { NextApiRequest, NextApiResponse } from "next";

export default function loginSeller(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    "signup_intent=seller; Path=/; HttpOnly; SameSite=Lax; Max-Age=900"
  );
  res.redirect("/api/auth/login");
}
