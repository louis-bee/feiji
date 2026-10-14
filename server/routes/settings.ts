import type { Profile, Settings } from "../../shared/types";
import type { RouteContext } from "../context";
import { fail } from "../errors";
import { dateSchema, nullableId, object, string, versionSchema } from "../schemas";
import { checkVersion, required, validDate } from "../validate";

export function registerSettings({ app, store }: RouteContext) {
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
}
