import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Store } from "./context";

const ACTOR_IDS = ["her", "him"] as const;
type ActorId = (typeof ACTOR_IDS)[number];

/** 客户端未带上身份时的兜底昵称，确保日志里始终有可读的操作者。 */
const GUEST = "访客";
const FALLBACK_NAMES: Record<ActorId, string> = {
  her: "飞机",
  him: "大黄丰",
};

/** 与前端 `web/store.ts` 中的 ACTOR_COOKIE 保持一致。 */
const ACTOR_COOKIE = "feiji_actor";

/** 请求/响应内容最多记录的字符数，避免超长正文把日志撑爆。 */
const MAX_BODY_CHARS = 2000;

interface ActorInfo {
  id: ActorId | null;
  name: string;
}

const actors = new WeakMap<FastifyRequest, ActorInfo>();
const responses = new WeakMap<FastifyRequest, unknown>();
const finished = new WeakSet<FastifyRequest>();

function cookieValue(request: FastifyRequest, name: string): string | undefined {
  const raw = request.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

/**
 * 身份来源：fetch/XHR 的 `x-actor` 请求头优先；
 * 图片、视频、静态资源等浏览器自发请求带不了自定义头，退回 cookie。
 */
function readActorId(request: FastifyRequest): ActorId | null {
  const raw = request.headers["x-actor"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  const value = header ?? cookieValue(request, ACTOR_COOKIE);
  return ACTOR_IDS.find((id) => id === value) ?? null;
}

function resolveActor(store: Store, request: FastifyRequest): ActorInfo {
  const id = readActorId(request);
  if (!id) return { id: null, name: GUEST };
  const nickname = store.get("profiles", id)?.nickname;
  return { id, name: nickname || FALLBACK_NAMES[id] };
}

function truncate(text: string) {
  if (text.length <= MAX_BODY_CHARS) return text;
  const omitted = text.length - MAX_BODY_CHARS;
  return `${text.slice(0, MAX_BODY_CHARS)}…(省略 ${omitted} 字符)`;
}

function headerValue(request: FastifyRequest, name: string) {
  const raw = request.headers[name];
  return Array.isArray(raw) ? raw.join(", ") : raw;
}

/** 请求数据：JSON 记正文，文件上传只记类型和字节数，不碰二进制内容。 */
function summarizeRequest(request: FastifyRequest) {
  const contentType = headerValue(request, "content-type") || "";
  const body = request.body as unknown;
  if (contentType.startsWith("multipart/"))
    return {
      contentType: contentType.split(";")[0],
      bytes: Number(headerValue(request, "content-length") || 0),
    };
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return truncate(body);
  if (typeof body === "object") return truncate(JSON.stringify(body));
  return String(body);
}

/** 响应数据：文本记正文，Buffer / 文件流只记类型和长度。 */
function summarizeResponse(payload: unknown, contentType: string) {
  if (payload === undefined || payload === null) return undefined;
  if (typeof payload === "string") return truncate(payload);
  if (Buffer.isBuffer(payload))
    return { contentType, bytes: payload.length };
  return { contentType, stream: true };
}

/**
 * 为每个请求打印一条访问日志，带上操作者身份、请求数据和响应数据。
 * 身份由客户端通过 `x-actor` 请求头（her / him）或 `feiji_actor` cookie 传递，
 * 昵称取自数据库里的资料。
 */
export function registerRequestLogging(app: FastifyInstance, store: Store) {
  app.addHook("onRequest", async (request) => {
    const actor = resolveActor(store, request);
    actors.set(request, actor);
    // 让本次请求的其它日志（如错误日志）也带上操作者。
    request.log = request.log.child({
      actor: actor.name,
      actorId: actor.id ?? "unknown",
    });
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const contentType =
      String(reply.getHeader("content-type") ?? "") || "unknown";
    responses.set(request, summarizeResponse(payload, contentType));
    return payload;
  });

  app.addHook("onResponse", async (request, reply) => {
    const actor = actors.get(request) ?? resolveActor(store, request);
    const ms = Math.round(reply.elapsedTime);
    finished.add(request);
    // actor / actorId 已由 onRequest 绑定到子 logger，这里不再重复输出。
    request.log.info(
      {
        method: request.method,
        url: request.url,
        status: reply.statusCode,
        ms,
        ip: request.ip,
        reqBody: summarizeRequest(request),
        resBody: responses.get(request),
      },
      `[${actor.name}] ${request.method} ${request.url} -> ${reply.statusCode} (${ms}ms)`,
    );
  });

  // 上传被取消等中途断开的请求不会有 onResponse，单独记一条。
  app.addHook("onRequestAbort", async (request) => {
    if (finished.has(request)) return;
    const actor = actors.get(request) ?? resolveActor(store, request);
    request.log.warn(
      { method: request.method, url: request.url, ip: request.ip },
      `[${actor.name}] ${request.method} ${request.url} -> 客户端中断`,
    );
  });
}
