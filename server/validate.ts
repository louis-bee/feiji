import { isDate, todayInZone } from "../shared/dates";
import type { Entry } from "../shared/types";
import type { Store } from "./context";
import { fail } from "./errors";

export function required<T>(value: T | undefined): T {
  if (value === undefined) fail(404, "内容不存在或已经删除。");
  return value;
}

export function checkVersion(value: { version: number }, version: number) {
  if (value.version !== version)
    fail(409, "内容已被更新，请刷新后重试，避免覆盖另一份修改。");
}

export function validDate(date: string) {
  if (!isDate(date) || date > "2099-12-31")
    fail(400, "请使用 1900 至 2099 年之间的有效公历日期。");
}

export function checkAlbum(store: Store, albumId: string | null) {
  if (albumId && !store.get("albums", albumId)) fail(400, "所选相册不存在。");
}

export function checkEntry(
  store: Store,
  body: Pick<Entry, "date" | "body" | "mediaIds">,
) {
  validDate(body.date);
  if (body.date > todayInZone(required(store.get("settings", "site")).timezone))
    fail(400, "未来的事，等发生以后再记下吧。");
  if (!body.body.trim() && !body.mediaIds.length)
    fail(400, "请写一句话，或添加图片、视频。");
  for (const id of body.mediaIds) {
    if (!store.get("media", id)) fail(400, "部分媒体不存在，请重新选择。");
  }
}
