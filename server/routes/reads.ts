import type { Actor, EntryRead } from "../../shared/types";
import type { RouteContext } from "../context";
import { dateSchema, object } from "../schemas";
import { validDate } from "../validate";

// 一方看过某一天的记录（日历里选中那一天）后，把那天对方的记录标为已读
export function registerReads({ app, store }: RouteContext) {
  app.post<{ Body: { actorId: Actor; date: string } }>(
    "/api/reads",
    {
      schema: {
        body: object({
          actorId: { enum: ["him", "her"] },
          date: dateSchema,
        }),
      },
    },
    async (request) => {
      const { actorId, date } = request.body;
      validDate(date);
      const reads = store.db.transaction(() => {
        const now = new Date().toISOString();
        for (const entry of store.list("entries")) {
          if (entry.date !== date || entry.authorId === actorId) continue;
          const id = `${actorId}:${entry.id}`;
          const current = store.get("reads", id);
          if (current && current.version >= entry.version) continue;
          store.put("reads", id, {
            actorId,
            entryId: entry.id,
            version: entry.version,
            readAt: now,
          } satisfies EntryRead);
        }
        return store.list("reads").filter((read) => read.actorId === actorId);
      })();
      return { reads };
    },
  );
}
