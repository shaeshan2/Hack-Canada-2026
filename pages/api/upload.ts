import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import formidable, { type File } from "formidable";
import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";
import { ensureDbUser } from "../../lib/session-user";
import { Role } from "@prisma/client";
import { sendError, sendValidation } from "../../lib/api/errors";
import { config as appConfig } from "../../lib/config";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const config = {
  api: { bodyParser: false },
};

function safeFilename(original: string): string {
  const ext = path.extname(original) || ".jpg";
  const base = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  return base + ext;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed", code: "BAD_REQUEST" });
    return;
  }

  return withApiAuthRequired(async function upload(
    protectedReq: NextApiRequest,
    protectedRes: NextApiResponse
  ) {
    const session = await getSession(protectedReq, protectedRes);
    if (!session?.user) {
      sendError(protectedRes, "Not authenticated", "UNAUTHORIZED", 401);
      return;
    }

    const dbUser = await ensureDbUser(session.user);
    if (dbUser.role !== Role.SELLER_VERIFIED) {
      sendError(protectedRes, "Only verified sellers can upload photos", "FORBIDDEN", 403);
      return;
    }

    const uploadDir = path.join(process.cwd(), appConfig.optional.uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new formidable.IncomingForm({
      uploadDir,
      keepExtensions: false,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
      filter: (part) => {
        if (part.mimetype && !ALLOWED_TYPES.includes(part.mimetype)) {
          return false;
        }
        return true;
      },
    });

    const [, parsedFiles] = await new Promise<[unknown, { files?: File | File[] }]>((resolve, reject) => {
      form.parse(protectedReq, (err, f, filesObj) => {
        if (err) reject(err);
        else resolve([f, filesObj]);
      });
    });

    const fileList = Array.isArray(parsedFiles.files) ? parsedFiles.files : parsedFiles.files ? [parsedFiles.files] : [];
    const validFiles = fileList.filter((f): f is File => f.size > 0 && !!f.filepath);
    if (validFiles.length === 0) {
      sendValidation(protectedRes, "At least one image file is required (jpeg, png, webp, gif)");
      return;
    }
    if (validFiles.length > MAX_FILES) {
      sendValidation(protectedRes, `Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const urls: string[] = [];
    for (const file of validFiles) {
      const name = safeFilename(file.originalFilename || "image.jpg");
      const dest = path.join(uploadDir, name);
      fs.renameSync(file.filepath, dest);
      urls.push(`/${appConfig.optional.uploadDir.replace(/^public\/?/, "")}/${name}`);
    }

    protectedRes.status(200).json({ urls });
  })(req, res);
}
