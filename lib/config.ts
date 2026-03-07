/**
 * Central config from environment. Throws in development if required vars are missing.
 */
function env(key: string, required = true): string | undefined {
  const value = process.env[key];
  if (required && (value === undefined || value === "")) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(`Missing required env: ${key}`);
    }
  }
  return value;
}

export const config = {
  auth0: {
    secret: env("AUTH0_SECRET"),
    baseUrl: env("AUTH0_BASE_URL") ?? "http://localhost:3000",
    issuerBaseUrl: env("AUTH0_ISSUER_BASE_URL"),
    clientId: env("AUTH0_CLIENT_ID"),
    clientSecret: env("AUTH0_CLIENT_SECRET"),
    domain: env("AUTH0_DOMAIN") ?? process.env.AUTH0_ISSUER_BASE_URL?.replace(/^https:\/\//, ""),
  },
  database: {
    url: env("DATABASE_URL"),
  },
  app: {
    appClipUrl: process.env.NEXT_PUBLIC_APP_CLIP_URL ?? "https://deedscan.app/clip",
  },
  optional: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    wsPort: Number(process.env.WS_PORT) || 3001,
    /** Upload directory relative to project root (e.g. public/uploads). For S3, set UPLOAD_PROVIDER=s3 and bucket. */
    uploadDir: process.env.UPLOAD_DIR ?? "public/uploads",
    uploadProvider: (process.env.UPLOAD_PROVIDER ?? "local") as "local" | "s3",
  },
} as const;
