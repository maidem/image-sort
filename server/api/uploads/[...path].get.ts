import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();
  const uploadPath = resolve(cfg.uploadPath as string);
  const param = getRouterParam(event, "path") || "";

  // Security: prevent path traversal
  const filename = param.replace(/[^a-zA-Z0-9._-]/g, "");
  const filePath = resolve(uploadPath, filename);

  if (!filePath.startsWith(uploadPath) || !existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  }

  const ext = extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const stat = statSync(filePath);

  setHeader(event, "Content-Type", mime);
  setHeader(event, "Content-Length", stat.size);
  setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

  return sendStream(event, createReadStream(filePath));
});
