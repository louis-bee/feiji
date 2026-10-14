import { randomUUID } from "node:crypto";
import type { Album } from "../../shared/types";
import type { RouteContext } from "../context";
import { fail } from "../errors";
import { albumFields, deleteQuery, object, versionSchema } from "../schemas";
import { checkVersion, required } from "../validate";

export function registerAlbums({ app, store }: RouteContext) {
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
}
