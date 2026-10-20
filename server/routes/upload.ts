import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import type { RouteContext } from "../context";
import type { StoredMedia } from "../database";
import { HttpError, fail } from "../errors";
import { mediaDto, removeFiles } from "../media";
import { todayInZone } from "../../shared/dates";
import { checkAlbum, required, validDate } from "../validate";

const SUPPORTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const MAX_CONCURRENT_UPLOADS = 2;

let activeUploads = 0;

export function registerUpload({ app, store, mediaDir }: RouteContext) {
  app.post("/api/uploads", async (request, reply) => {
    if (activeUploads >= MAX_CONCURRENT_UPLOADS)
      fail(429, "正在处理其他上传，请稍后再试。");
    activeUploads++;
    const id = randomUUID();
    const originalFile = `${id}.original`;
    const originalPath = join(mediaDir, originalFile);
    const generated: string[] = [originalFile];
    let saved = false;
    try {
      let name = "";
      let mime = "";
      let size = 0;
      let albumId: string | null = null;
      let date = "";
      let fileFound = false;
      for await (const part of request.parts()) {
        if (part.type === "field") {
          if (typeof part.value !== "string") fail(400, "上传字段不正确");
          if (part.fieldname === "albumId") albumId = part.value || null;
          else if (part.fieldname === "date") date = part.value;
          else fail(400, "上传字段不正确");
          continue;
        }
        fileFound = true;
        name = part.filename.slice(0, 255);
        mime = part.mimetype;
        if (!SUPPORTED_MIME.includes(mime)) {
          part.file.resume();
          fail(
            415,
            "请选择 JPEG、PNG、WEBP、GIF、MP4、MOV 或 WEBM 格式的图片或视频文件。",
          );
        }
        part.file.on("data", (chunk: Buffer) => {
          size += chunk.length;
        });
        await pipeline(
          part.file,
          createWriteStream(originalPath, { flags: "wx", mode: 0o600 }),
        );
        if (part.file.truncated) fail(413, "文件超过服务器当前上传限制。");
      }
      if (!fileFound || size === 0) fail(400, "请选择一个非空文件。");
      checkAlbum(store, albumId);
      let width: number | null = null;
      let height: number | null = null;
      let thumbFile: string | null = null;
      let viewFile = originalFile;
      const kind = mime.startsWith("image/") ? "image" : "video";
      if (kind === "image") {
        try {
          const metadata = await sharp(originalPath, {
            limitInputPixels: 40_000_000,
          }).metadata();
          if (!["jpeg", "png", "webp", "gif"].includes(metadata.format || ""))
            fail(415, "图片内容与支持格式不同。");
          const dimensions = metadata.autoOrient || {
            width: metadata.width,
            height: metadata.height,
          };
          width = dimensions.width || null;
          height = dimensions.height || null;
          mime = `image/${metadata.format}`;
          thumbFile = `${id}.thumb.webp`;
          generated.push(thumbFile);
          await sharp(originalPath, { limitInputPixels: 40_000_000 })
            .rotate()
            .resize({
              width: 480,
              height: 400,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 78 })
            .toFile(join(mediaDir, thumbFile));
          if (metadata.format !== "gif") {
            viewFile = `${id}.view.webp`;
            generated.push(viewFile);
            const info = await sharp(originalPath, {
              limitInputPixels: 40_000_000,
            })
              .rotate()
              .resize({
                width: 2000,
                height: 2000,
                fit: "inside",
                withoutEnlargement: true,
              })
              .webp({ quality: 84 })
              .toFile(join(mediaDir, viewFile));
            width = info.width;
            height = info.height;
          }
        } catch (e) {
          if (
            e instanceof HttpError ||
            (e as NodeJS.ErrnoException).code === "ENOSPC"
          )
            throw e;
          fail(415, "图片无法处理：请确认文件完整且不超过 4000 万像素。");
        }
      } else {
        const handle = await open(originalPath, "r");
        const head = Buffer.alloc(32);
        try {
          await handle.read(head, 0, 32, 0);
        } finally {
          await handle.close();
        }
        const webm = head
          .subarray(0, 4)
          .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        const mp4 = head.toString("ascii", 4, 8) === "ftyp";
        if (!webm && !mp4)
          fail(
            415,
            "未识别到支持的视频格式，请选择 WEBM 或 MP4 格式的视频文件。",
          );
        mime = webm
          ? "video/webm"
          : mime === "video/quicktime"
            ? "video/quicktime"
            : "video/mp4";
      }
      if (date) validDate(date);
      const mediaDate =
        date || todayInZone(required(store.get("settings", "site")).timezone);
      const media: StoredMedia = {
        id,
        kind,
        name,
        mime,
        width,
        height,
        size,
        albumId,
        caption: "",
        date: mediaDate,
        featured: false,
        url: `/media/${id}/view`,
        thumbUrl: thumbFile ? `/media/${id}/thumb` : null,
        version: 1,
        createdAt: new Date().toISOString(),
        originalFile,
        viewFile,
        thumbFile,
      };
      checkAlbum(store, albumId);
      store.put("media", media.id, media);
      saved = true;
      return reply.code(201).send(mediaDto(media));
    } finally {
      activeUploads--;
      if (!saved) await removeFiles(mediaDir, generated);
    }
  });
}
