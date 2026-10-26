import Fastify from "fastify";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { openDatabase } from "./database";
import { registerRequestLogging } from "./logging";
import { registerAlbums } from "./routes/albums";
import { registerBootstrap } from "./routes/bootstrap";
import { registerEntries } from "./routes/entries";
import { registerEvents } from "./routes/events";
import { registerMedia } from "./routes/media";
import { registerReads } from "./routes/reads";
import { registerSettings } from "./routes/settings";
import { registerUpload } from "./routes/upload";
import { registerWebRoutes } from "./routes/web";

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
    // 由 registerRequestLogging 统一打印访问日志（带操作者身份）。
    disableRequestLogging: true,
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

  registerRequestLogging(app, store);

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

  const routes = { app, store, mediaDir };
  registerBootstrap(routes);
  registerSettings(routes);
  registerEntries(routes);
  registerReads(routes);
  registerAlbums(routes);
  registerEvents(routes);
  registerMedia(routes);
  registerUpload(routes);
  registerWebRoutes(app, join(projectRoot, "dist"), options.serveWeb !== false);

  return app;
}
