import { randomUUID } from "node:crypto";
import type { EventItem } from "../../shared/types";
import type { RouteContext } from "../context";
import { fail } from "../errors";
import { deleteQuery, eventFields, object, versionSchema } from "../schemas";
import { checkVersion, required, validDate } from "../validate";

export function registerEvents({ app, store }: RouteContext) {
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
}
