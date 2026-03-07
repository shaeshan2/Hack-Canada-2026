import type { NextApiRequest, NextApiResponse } from "next";
import { validatePassword } from "../../../lib/password-validation";

const AUTH0_CONNECTION =
  process.env.AUTH0_SIGNUP_CONNECTION || "Username-Password-Authentication";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, password, name, role } = req.body ?? {};
  const intent = role === "seller" ? "seller" : "buyer";

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const pwResult = validatePassword(password ?? "");
  if (!pwResult.valid) {
    res
      .status(400)
      .json({ error: pwResult.errors[0], errors: pwResult.errors });
    return;
  }

  const domain =
    process.env.AUTH0_DOMAIN ||
    process.env.AUTH0_ISSUER_BASE_URL?.replace(/^https:\/\//, "").replace(
      /\/$/,
      "",
    );
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  if (!domain || !clientId || !clientSecret) {
    res
      .status(500)
      .json({
        error:
          "Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET.",
      });
    return;
  }

  const signupUrl = `https://${domain}/dbconnections/signup`;
  const body = JSON.stringify({
    client_id: clientId,
    email: String(email).trim(),
    password: String(password),
    connection: AUTH0_CONNECTION,
    name: typeof name === "string" && name.trim() ? name.trim() : undefined,
  });

  const authRes = await fetch(signupUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = (await authRes.json().catch(() => ({}))) as {
    code?: string;
    description?: string;
    error?: string;
  };

  if (!authRes.ok) {
    const msg = data.description || data.error || "Signup failed";
    console.error("[register] Auth0 signup error:", authRes.status, JSON.stringify(data));
    if (
      msg.toLowerCase().includes("already") ||
      msg.toLowerCase().includes("exists")
    ) {
      res
        .status(409)
        .json({
          error:
            "An account with this email already exists. Try logging in instead.",
        });
      return;
    }
    res.status(400).json({ error: msg });
    return;
  }

  res.setHeader(
    "Set-Cookie",
    `signup_intent=${intent}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`,
  );
  const loginUrl = `/api/auth/login?login_hint=${encodeURIComponent(String(email).trim())}&screen_hint=login`;
  res.status(200).json({ ok: true, redirect: loginUrl });
}
