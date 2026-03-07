import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import formidable, { type File } from "formidable";
import { auth0 } from "../../../lib/auth0";
import { ensureDbUser } from "../../../lib/session-user";
import { Role } from "@prisma/client";
import { sendError, sendValidation } from "../../../lib/api/errors";
import { config as appConfig } from "../../../lib/config";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_VERIFICATION_EXTS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

function safeFilename(suffix: string, mimetype: string | null): string {
  const ext = (mimetype && ALLOWED_VERIFICATION_EXTS[mimetype]) ?? ".jpg";
  const rand = crypto.randomBytes(16).toString("hex");
  return `${Date.now().toString(36)}-${suffix}-${rand}${ext}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  return auth0.withApiAuthRequired(async function upload(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse,
  ) {
    const session = await auth0.getSession(protectedReq);
    if (!session?.user) {
      sendError(protectedRes, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const dbUser = await ensureDbUser(session.user);
    if (
      dbUser.role !== Role.SELLER_PENDING &&
      dbUser.role !== Role.SELLER_VERIFIED
    ) {
      sendError(
        protectedRes,
        "Sign up as a seller first to upload verification documents",
        "FORBIDDEN",
        403,
      );
      return;
    }

    const uploadDir = path.join(process.cwd(), appConfig.optional.uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: false,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 2,
      filter: (part) => {
        if (part.mimetype && !ALLOWED_TYPES.includes(part.mimetype)) {
          return false;
        }
        return true;
      },
    });

    const [, parsedFiles] = await new Promise<
      [unknown, { govId?: File; ownershipProof?: File }]
    >((resolve, reject) => {
      form.parse(protectedReq, (err, f, files) => {
        if (err) reject(err);
        else resolve([f, files as { govId?: File; ownershipProof?: File }]);
      });
    });

    const govId = parsedFiles.govId;
    const ownershipProof = parsedFiles.ownershipProof;

    if (!govId || !govId.filepath || govId.size === 0) {
      sendValidation(
        protectedRes,
        "Government ID document is required (PDF or image)",
      );
      return;
    }
    if (
      !ownershipProof ||
      !ownershipProof.filepath ||
      ownershipProof.size === 0
    ) {
      sendValidation(
        protectedRes,
        "Proof of ownership document is required (PDF or image)",
      );
      return;
    }

    const publicPath = appConfig.optional.uploadDir.replace(/^public\/?/, "");
    const govIdName = safeFilename("gov", govId.mimetype ?? null);
    const ownershipName = safeFilename("own", ownershipProof.mimetype ?? null);

    const govIdDest = path.join(uploadDir, govIdName);
    const ownershipDest = path.join(uploadDir, ownershipName);

    fs.renameSync(govId.filepath, govIdDest);
    fs.renameSync(ownershipProof.filepath, ownershipDest);

    protectedRes.status(200).json({
      govIdDocumentUrl: `/${publicPath}/${govIdName}`,
      ownershipProofUrl: `/${publicPath}/${ownershipName}`,
    });
  })(req, res);
}
