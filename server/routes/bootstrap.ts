import type { RouteContext } from "../context";
import { mediaDto } from "../media";

export function registerBootstrap({ app, store }: RouteContext) {
  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/bootstrap", async () => ({
    settings: store.get("settings", "site"),
    profile: store.list("profiles"),
    entries: store
      .list("entries")
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    media: store.list("media").reverse().map(mediaDto),
    albums: store.list("albums"),
    events: store.list("events"),
  }));
}
