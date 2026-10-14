import type { Media } from "../../shared/types";
import type { RouteContext } from "../context";
import { fail } from "../errors";
import { mediaDto, removeFiles } from "../media";
import {
  dateSchema,
  deleteQuery,
  nullableId,
  object,
  string,
  versionSchema,
} from "../schemas";
import { checkAlbum, checkVersion, required, validDate } from "../validate";

export function registerMedia({ app, store, mediaDir }: RouteContext) {
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
      checkAlbum(store, request.body.albumId);
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
    await removeFiles(
      mediaDir,
      [current.originalFile, current.viewFile, current.thumbFile].filter(
        (file): file is string => !!file,
      ),
      (error) => app.log.warn({ err: error }, "媒体文件清理失败"),
    );
    return { ok: true };
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
}
