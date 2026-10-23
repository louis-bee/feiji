import { todayInZone } from "../shared/dates";

/** 生日开屏：只在生日前夜（10-24）和生日当天（10-25）出现。 */
const BIRTHDAY_MONTH = "10";
const BIRTHDAY_DAY = 25;

/** eve = 生日前夜，day = 生日当天 */
export type SplashMode = "eve" | "day";

export function birthdayMode(today: string): SplashMode | null {
  if (today.slice(5, 7) !== BIRTHDAY_MONTH) return null;
  const day = Number(today.slice(8, 10));
  if (day === BIRTHDAY_DAY) return "day";
  if (day === BIRTHDAY_DAY - 1) return "eve";
  return null;
}

/**
 * 是否播放开屏。按设置里的时区判断日期，每次打开或刷新页面都会播。
 * 调试用：`?birthday=1` 强制播放，`?birthday=0` 关闭。
 */
export function splashMode(
  timezone: string,
  now = new Date(),
  search = typeof location === "undefined" ? "" : location.search,
): SplashMode | null {
  const flag = new URLSearchParams(search).get("birthday");
  if (flag === "0") return null;
  return birthdayMode(todayInZone(timezone, now)) ?? (flag === "1" ? "day" : null);
}
