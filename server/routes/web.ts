import { existsSync } from "node:fs";
import { join } from "node:path";
import staticFiles from "@fastify/static";
import type { FastifyInstance } from "fastify";

export function registerWebRoutes(
  app: FastifyInstance,
  dist: string,
  enabled: boolean,
) {
  if (!enabled || !existsSync(join(dist, "index.html"))) {
    app.setNotFoundHandler((_request, reply) => {
      reply.code(404).send({ message: "接口不存在" });
    });
    return;
  }
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
}
