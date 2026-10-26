import { randomUUID } from "node:crypto";
import type { Entry } from "../../shared/types";
import type { RouteContext } from "../context";
import {
  deleteQuery,
  entryFields,
  object,
  versionSchema,
} from "../schemas";
import { checkEntry, checkVersion, required } from "../validate";

export function registerEntries({ app, store }: RouteContext) {
  app.post<{ Body: Pick<Entry, "date" | "authorId" | "body" | "mediaIds"> }>(
    "/api/entries",
    {
      schema: {
        body: object(entryFields),
      },
    },
    async (request, reply) => {
      const result = store.db.transaction(() => {
        checkEntry(store, request.body);
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
      return store.db.transaction(() => {
        const current = required(store.get("entries", request.params.id));
        checkVersion(current, request.body.version);
        checkEntry(store, request.body);
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
      store.db.transaction(() => {
        store.remove("entries", current.id);
        for (const actorId of ["her", "him"] as const) {
          store.remove("reads", `${actorId}:${current.id}`);
        }
      })();
      return { ok: true };
    },
  );
}
