const DAY = 86_400_000; // 24 * 60 * 60 * 1000

export function isDate(value: string): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1990-01-01" ||
    value > "9999-12-31")
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function todayInZone(zone = "Asia/Shanghai", now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dayDiff(from: string, to: string): number {
  if (!isDate(from) || !isDate(to)) throw new Error("无效日期");
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

export function addDays(value: string, days: number): string {
  if (!isDate(value)) throw new Error("无效日期");
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function nextOccurrence(
  date: string,
  today: string,
  repeat: "yearly" | "once"
): string {
  if (!isDate(date) || !isDate(today)) throw new Error("无效日期");
  if (repeat === "once") return date;
  let year = Math.max(Number(date.slice(0, 4)), Number(today.slice(0, 4)));
  while (year < 9999) {
    const candidate = `${year}-${date.slice(5)}`;
    if (isDate(candidate) && candidate >= today) return candidate;
    year++;
  }
  throw new Error("日期超出支持范围");
}

export function monthCells(month: string): string[] {
  const first = `${month}-01`;
  if (!isDate(first)) return [];
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -((weekday + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function dateLabel(date: string, withYear = false): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    year: withYear ? "numeric" : undefined,
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}