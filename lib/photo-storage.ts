import fs from "fs";
import path from "path";
import { config as appConfig } from "./config";

function safeFilename(original: string) {
  const ext = path.extname(original) || ".jpg";
  const base = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  return `${base}${ext}`;
}

export async function storePhoto(filePath: string, originalFilename: string, mimetype: string | null) {
  void mimetype;
  const filename = safeFilename(originalFilename || "image.jpg");

  const uploadDir = path.join(process.cwd(), appConfig.optional.uploadDir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const destination = path.join(uploadDir, filename);
  fs.renameSync(filePath, destination);
  return `/${appConfig.optional.uploadDir.replace(/^public\/?/, "")}/${filename}`;
}
