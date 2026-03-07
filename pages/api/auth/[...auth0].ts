import "../../../lib/auth0-env";
import type { NextApiRequest, NextApiResponse } from "next";

export default function legacyAuthRoute(_req: NextApiRequest, res: NextApiResponse) {
  res.status(404).json({ error: "Auth routes are handled by proxy.ts middleware." });
}
