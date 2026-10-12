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
import { f } from "vue-router/dist/router-CWoNjPRp.mjs";

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
    uploadItems: true,
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

export function creataApp(options: {
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
  return app;
}
