import Fastify from "fastify";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { open, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { openDatabase, type StoredMedia } from "./database";
import { isDate, todayInZone } from "../shared/dates";
import type {
  Album,
  Entry,
  EventItem,
  Media,
  Profile,
  Settings,
} from "../web/types";

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
const string = (maxlength: number, minlength = 0) => ({
  type: "string",
  minLength: minlength,
  maxLength: maxlength,
});
const dateSchema = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const versionSchema = { type: "integer", minimum: 1 };
const nullableId = { anyOf: [string(100, 1), { type: "null" }] };
const object = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) => ({ type: "object", properties, required, additionalProperties: false });
const entryFields = {
  date: dateSchema,
  authorId: { enum: ["him", "her"] },
  body: string(20000),
  mediaIds: {
    type: "array",
    items: string(100, 1),
    maxItems: 100,
    uniqueItems: true,
  },
};
const albumFields = {
  name: string(100, 1),
  description: string(2000),
};
const eventFields = {
  title: string(120, 1),
  date: dateSchema,
  repeat: { enum: ["yearly", "once"] },
  note: string(2000),
};
const deleteQuery = { querystring: object({ version: versionSchema }) };
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function createApp(options: {
  dataDir?: string;
  serveWeb?: boolean;
  logger?: boolean;
  maxUoloadBytes?: number;
}) {
  const dataDir = resolve(options.dataDir || join(projectRoot, "var"));
  const mediaDir = join(dataDir, "media");
  mkdirSync(mediaDir, { recursive: true });
  const store = openDatabase(dataDir);
  const app = Fastify({
    logger: options.logger || false,
    bodyLimit: 256 * 1024,
    ajv: { customOptions: { removeAdditional: true } },
  });
  const maxUploadBytes =
    options.maxUoloadBytes ||
    (process.env.MAX_UPLOAD_BYTES
      ? Number(process.env.MAX_UPLOAD_BYTES)
      : Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes <= 0) {
    store.db.close();
    throw new Error("MAX_UPLOAD_BYTES 必须是正整数");
  }
  sharp.concurrency(1);
  sharp.cache({ memory: 32, files: 0, items: 20 });

  app.register(multipart, {
    limits: { fileSize: maxUploadBytes, files: 1, fields: 2, parts: 3 },
    throwFileSizeLimit: true,
  });
  app.register(staticFiles, {
    root: mediaDir,
    serve: false,
    index: false,
    cacheControl: false,
  });

  app.addHook("onClose", async () => {
    store.db.close();
  });

  app.setErrorHandler((error, request, reply) => {
    const known = error as {
      statusCode?: number;
      code?: string;
      validation?: unknown;
      message?: string;
    };
    let status = known.statusCode || 500;
    let message = known.message || "请求失败";
    if (known.validation) {
      status = 400;
      message = "输入不符合要求，请检查必填项、格式和长度。";
    }
    if (known.code === "FST_REQ_FILE_TOO_LARGE") {
      status = 413;
      message = "文件超过服务器当前上传限制，请调整部署配置后重试。";
    }
    if (known.code === "ENOSPC") {
      status = 507;
      message = "服务器空间不足，文件未保存，请稍后重试。";
    }
    if (status >= 500 && known.code !== "ENOSPC") {
      request.log.error(error);
      message = "服务器暂时无法完成操作，请稍后重试。";
    }
    if (reply.sent) return;
    reply.code(status).send({ message });
  });

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    if (request.url.startsWith("/api/")) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });

  const validDate = (date: string) => {
    if (!isDate(date) || date > "2099-12-31")
      fail(400, "请使用 1900 至 2099 年之间的有效公历日期。");
  };
  function required<T>(value: T | undefined): T {
    if (value === undefined) fail(404, "内容不存在或已经删除。");
    return value;
  }
  function checkVersion(value: { version: number }, version: number) {
    if (value.version !== version)
      fail(409, "内容已被更新，请刷新后重试，避免覆盖另一份修改。");
  }
  function mediaDto(media: StoredMedia): Media {
    const { originalFile, viewFile, thumbFile, ...result } = media;
    return result;
  }
  function checkAlbum(albumId: string | null) {
    if (albumId && !store.get("albums", albumId)) fail(400, "所选相册不存在。");
  }
  function checkEntry(body: Pick<Entry, "date" | "body" | "mediaIds">) {
    validDate(body.date);
    if (
      body.date > todayInZone(required(store.get("settings", "site")).timezone)
    )
      fail(400, "未来的事，等发生以后再记下吧。");
    if (!body.body.trim() && !body.mediaIds.length)
      fail(400, "请写一句话，或添加图片、视频。");
    for (const id of body.mediaIds) {
      if (!store.get("media", id)) fail(400, "部分媒体不存在，请重新选择。");
    }
  }

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/bootstrap", async () => ({
    settings: store.get("settings", "site"),
    profile: store.list("profiles"),
    entries: store
      .list("entries")
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    media: store.list("media").reverse().map(mediaDto),
    albums: store.list("albums"),
    events: store.list("events"),
  }));

  app.get("/api/profiles", async () => store.list("profiles"));

  app.put<{ Body: Settings }>(
    "/api/settings",
    {
      schema: {
        body: object({
          startDate: dateSchema,
          timezone: string(100, 1),
          coverMediaId: nullableId,
          intro: string(300),
          version: versionSchema,
        }),
      },
    },
    async (request) => {
      const body = request.body;
      validDate(body.startDate);
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: body.timezone }).format();
      } catch {
        fail(400, "时区无效，请使用 Asia/Shanghai 等 IANA 时区名称。");
      }
      if (
        body.coverMediaId &&
        store.get("media", body.coverMediaId)?.kind !== "image"
      )
        fail(400, "封面需要选择已上传的图片。");
      return store.db.transaction(() => {
        const current = required(store.get("settings", "site"));
        checkVersion(current, body.version);
        return store.put("settings", "site", {
          ...body,
          intro: body.intro.trim(),
          version: current.version + 1,
        });
      })();
    },
  );

  app.put<{
    Params: { id: "her" | "him" };
    Body: Pick<Profile, "nickname" | "birthday">;
  }>(
    "/api/profiles/:id",
    {
      schema: {
        body: object({
          nickname: string(40, 1),
          birthday: dateSchema,
        }),
      },
    },
    async (request) => {
      const current = required(store.get("profiles", request.params.id));
      validDate(request.body.birthday);
      if (!request.body.nickname.trim()) fail(400, "昵称不能为空。");
      return store.put("profiles", current.id, {
        ...current,
        nickname: request.body.nickname.trim(),
        birthday: request.body.birthday,
      });
    },
  );

  app.post<{ Body: Pick<Entry, "date" | "authorId" | "body" | "mediaIds"> }>(
    "/api/entries",
    {
      schema: {
        body: object(entryFields),
      },
    },
    async (request, reply) => {
      const result = store.db.transaction(() => {
        checkEntry(request.body);
        const now = new Date().toISOString();
        const entry: Entry = {
          ...request.body,
          body: request.body.body.trim(),
          id: randomUUID(),
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
        return store.put("entries", entry.id, entry);
      })();
      return reply.code(201).send(result);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: Pick<Entry, "date" | "authorId" | "body" | "mediaIds" | "version">;
  }>(
    "/api/entries/:id",
    {
      schema: {
        body: object({
          ...entryFields,
          version: versionSchema,
        }),
      },
    },
    async (request) => {
      store.db.transaction(() => {
        const current = required(store.get("entries", request.params.id));
        checkVersion(current, request.body.version);
        checkEntry(request.body);
        return store.put("entries", current.id, {
          ...current,
          ...request.body,
          body: request.body.body.trim(),
          version: current.version + 1,
          updatedAt: new Date().toISOString(),
        });
      })();
    },
  );

  app.delete<{ Params: { id: string }; Querystring: { version: number } }>(
    "/api/entries/:id",
    {
      schema: deleteQuery,
    },
    async (request) => {
      const current = required(store.get("entries", request.params.id));
      checkVersion(current, request.query.version);
      store.remove("entries", current.id);
      return { ok: true };
    },
  );

  app.post<{ Body: Pick<Album, "name" | "description"> }>(
    "/api/albums",
    { schema: { body: object(albumFields) } },
    async (request, reply) => {
      if (!request.body.name.trim()) fail(400, "相册名称不能为空。");
      const album = {
        ...request.body,
        name: request.body.name.trim(),
        id: randomUUID(),
        version: 1,
      };
      return reply.code(201).send(store.put("albums", album.id, album));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: Pick<Album, "name" | "description" | "version">;
  }>(
    "/api/albums/:id",
    { schema: { body: object({ ...albumFields, version: versionSchema }) } },
    async (request) => {
      const current = required(store.get("albums", request.params.id));
      checkVersion(current, request.body.version);
      if (!request.body.name.trim()) fail(400, "相册名称不能为空。");
      return store.put("albums", current.id, {
        ...current,
        ...request.body,
        name: request.body.name.trim(),
        version: current.version + 1,
      });
    },
  );

  app.delete<{
    Params: { id: string };
    Querystring: { version: number };
  }>("/api/albums/:id", { schema: deleteQuery }, async (request) => {
    const current = required(store.get("albums", request.params.id));
    checkVersion(current, request.query.version);
    if (store.list("media").some((m) => m.albumId === current.id))
      fail(400, "相册里还有媒体，请先将它们移到其它相册或设为未归类。");
    store.remove("albums", current.id);
    return { ok: true };
  });

  app.post<{ Body: Pick<EventItem, "title" | "date" | "repeat" | "note"> }>(
    "/api/events",
    { schema: { body: object(eventFields) } },
    async (request, reply) => {
      validDate(request.body.date);
      if (!request.body.title.trim()) fail(400, "纪念日名称不能为空。");
      const event = {
        ...request.body,
        title: request.body.title.trim(),
        id: randomUUID(),
        version: 1,
      };
      return reply.code(201).send(store.put("events", event.id, event));
    },
  );

  app.patch<{
    Params: { id: string };
    Body: Pick<EventItem, "title" | "date" | "repeat" | "note" | "version">;
  }>(
    "/api/events/:id",
    { schema: { body: object({ ...eventFields, version: versionSchema }) } },
    async (request) => {
      const current = required(store.get("events", request.params.id));
      checkVersion(current, request.body.version);
      validDate(request.body.date);
      if (!request.body.title.trim()) fail(400, "纪念日名称不能为空。");
      return store.put("events", current.id, {
        ...current,
        ...request.body,
        title: request.body.title.trim(),
        version: current.version + 1,
      });
    },
  );

  app.delete<{
    Params: { id: string };
    Querystring: { version: number };
  }>("/api/events/:id", { schema: deleteQuery }, async (request) => {
    const current = required(store.get("events", request.params.id));
    checkVersion(current, request.query.version);
    store.remove("events", current.id);
    return { ok: true };
  });

  app.patch<{
    Params: { id: string };
    Body: Pick<Media, "caption" | "date" | "albumId" | "featured" | "version">;
  }>(
    "/api/media/:id",
    {
      schema: {
        body: object({
          caption: string(2000),
          date: { anyOf: [dateSchema, { type: "null" }] },
          albumId: nullableId,
          featured: { type: "boolean" },
          version: versionSchema,
        }),
      },
    },
    async (request) => {
      const current = required(store.get("media", request.params.id));
      checkVersion(current, request.body.version);
      checkAlbum(request.body.albumId);
      if (request.body.date) validDate(request.body.date);
      return mediaDto(
        store.put("media", current.id, {
          ...current,
          ...request.body,
          version: current.version + 1,
        }),
      );
    },
  );

  app.delete<{
    Params: { id: string };
    Querystring: { version: number };
  }>("/api/media/:id", { schema: deleteQuery }, async (request) => {
    const current = required(store.get("media", request.params.id));
    checkVersion(current, request.query.version);
    if (
      store.list("entries").some((e) => e.mediaIds.includes(current.id)) ||
      store.get("settings", "site")?.coverMediaId === current.id
    )
      fail(409, "这个文件仍被日记或封面引用，请先移除引用再删除。");
    store.remove("media", current.id);
    await Promise.all(
      [
        ...new Set(
          [current.originalFile, current.viewFile, current.thumbFile].filter(
            (file): file is string => !!file,
          ),
        ),
      ].map(async (file) => {
        try {
          await unlink(join(mediaDir, file));
        } catch (e) {
          app.log.warn({ err: e }, "媒体文件清理失败");
        }
      }),
    );
    return { ok: true };
  });

  let activeUploads = 0;
  app.post("/api/upload", async (request, reply) => {
    if (activeUploads >= 2) fail(429, "正在处理其他上传，请稍后再试。");
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
      let fileFound = false;
      for await (const part of request.parts()) {
        if (part.type === "field") {
          if (part.fieldname !== "albumId" || typeof part.value !== "string")
            fail(400, "上传字段不正确");
          albumId = part.value || null;
          continue;
        }
        fileFound = true;
        name = part.filename.slice(0, 255);
        mime = part.mimetype;
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
          ].includes(mime)
        ) {
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
      checkAlbum(albumId);
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
        date: null,
        featured: false,
        url: `/media/${id}/view`,
        thumbUrl: thumbFile ? `/media/${id}/thumb` : null,
        version: 1,
        createdAt: new Date().toISOString(),
        originalFile,
        viewFile,
        thumbFile,
      };
      checkAlbum(albumId);
      store.put("media", media.id, media);
      saved = true;
      return reply.code(201).send(mediaDto(media));
    } finally {
      activeUploads--;
      if (!saved) {
        await Promise.all(
          generated.map(async (file) =>
            unlink(join(mediaDir, file)).catch(() => {}),
          ),
        );
      }
    }
  });

  app.get<{ Params: { id: string; variant: string } }>(
    "/media/:id/:variant",
    async (request, reply) => {
      const media = required(store.get("media", request.params.id));
      const filename =
        request.params.variant === "view"
          ? media.viewFile
          : request.params.variant === "thumb"
            ? media.thumbFile
            : null;
      if (!filename) fail(404, "文件不存在或已被删除。");
      reply.header("Content-Type", "private, max-age=3600");
      reply.type(filename.endsWith(".webp") ? "image/webp" : media.mime);
      return reply.sendFile(filename, {
        cacheControl: false,
        acceptRanges: true,
        immutable: false,
      });
    },
  );

  const dist = join(projectRoot, "dist");
  if (options.serveWeb !== false && existsSync(join(dist, "index.html"))) {
    app.register(staticFiles, {
      root: dist,
      decorateReply: false,
      wildcard: false,
      index: false,
    });
    app.setNotFoundHandler((request, reply) => {
      const path = request.url.split("?")[0];
      if (
        !["GET", "HEAD"].includes(request.method) ||
        /^\/(api|media)(\/|$)/.test(path) ||
        path.split("/").pop()?.includes(".")
      )
        return reply.code(404).send({ message: "未找到资源" });
      return reply
        .header("Cache-Control", "no-store")
        .sendFile("index.html", dist, { cacheControl: false });
    });
  } else {
    app.setNotFoundHandler((_request, reply) => {
      reply.code(404).send({ message: "接口不存在" });
    });
  }

  return app;
}
