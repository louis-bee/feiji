import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  Actor,
  Album,
  Entry,
  EntryRead,
  EventItem,
  Media,
  Profile,
  Settings,
} from "../shared/types";

export type StoredMedia = Media & {
  originalFile: string;
  viewFile: string;
  thumbFile: string | null;
};
interface Tables {
  settings: Settings;
  profiles: Profile;
  entries: Entry;
  albums: Album;
  events: EventItem;
  media: StoredMedia;
  reads: EntryRead;
}
type Table = keyof Tables;
const TABLES = [
  "settings",
  "profiles",
  "entries",
  "albums",
  "events",
  "media",
  "reads",
] as const;
// 1: 初版；2: 新增 reads（未读提示），并把已有记录视为已读
const SCHEMA_VERSION = 2;

export function openDatabase(directory: string) {
  mkdirSync(directory, { recursive: true });
  const db = new Database(join(directory, "journal.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version > SCHEMA_VERSION) {
    db.close();
    throw new Error("数据库版本高于应用版本，请勿直接降级。");
  }
  db.transaction(() => {
    for (const table of TABLES) {
      db.exec(
        `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)))`,
      );
    }
    db.exec(
      "CREATE INDEX IF NOT EXISTS entries_date ON entries (json_extract(payload, '$.date')); CREATE INDEX IF NOT EXISTS media_album ON media(json_extract(payload, '$.albumId'));",
    );
    if (version < 2) {
      // 升级时把已有记录一次性标记为已读：未读只统计此后的新增与编辑，
      // 免得刚上线时另一边忽然看到一大串历史未读。
      const insertRead = db.prepare(
        "INSERT OR REPLACE INTO reads (id, payload) VALUES (?, ?)",
      );
      const rows = db.prepare("SELECT payload FROM entries").all() as {
        payload: string;
      }[];
      const now = new Date().toISOString();
      for (const row of rows) {
        const entry = JSON.parse(row.payload) as Entry;
        const reader: Actor = entry.authorId === "her" ? "him" : "her";
        insertRead.run(
          `${reader}:${entry.id}`,
          JSON.stringify({
            actorId: reader,
            entryId: entry.id,
            version: entry.version,
            readAt: now,
          } satisfies EntryRead),
        );
      }
      db.pragma(`user_version = ${SCHEMA_VERSION}`);
    }
  })();
  function tableName(table: Table) {
    if (!TABLES.includes(table)) throw new Error(`Invalid table: ${table}`);
    return table;
  }
  function get<K extends Table>(table: K, id: string): Tables[K] | undefined {
    const row = db
      .prepare(`SELECT payload FROM ${tableName(table)} WHERE id = ?`)
      .get(id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as Tables[K]) : undefined;
  }
  function list<K extends Table>(table: K): Tables[K][] {
    return (
      db
        .prepare(`SELECT payload FROM ${tableName(table)} ORDER BY rowid`)
        .all() as { payload: string }[]
    ).map((row) => JSON.parse(row.payload));
  }
  function put<K extends Table>(table: K, id: string, value: Tables[K]) {
    db.prepare(
      `INSERT INTO ${tableName(table)} (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
    ).run(id, JSON.stringify(value));
    return value;
  }
  function remove<K extends Table>(table: K, id: string) {
    db.prepare(`DELETE FROM ${tableName(table)} WHERE id = ?`).run(id);
  }
  db.transaction(() => {
    if (!get("settings", "site")) {
      put("settings", "site", {
        startDate: "2026-06-11",
        timezone: "Asia/Shanghai",
        coverMediaId: null,
        intro: "从这一天起，一起去更远的地方。",
        version: 1,
      });
    }
    if (!get("profiles", "her")) {
      put("profiles", "her", {
        id: "her",
        nickname: "飞机",
        birthday: "2006-10-25",
      });
    }
    if (!get("profiles", "him")) {
      put("profiles", "him", {
        id: "him",
        nickname: "大黄丰",
        birthday: "2004-08-11",
      });
    }
    if (!list("albums").length && version === 0) {
      put("albums", "daily", {
        id: "daily",
        name: "日常碎片",
        description: "不必特别，每一天都值得收藏。",
        version: 1,
      });
    }
  })();
  return { db, get, list, put, remove };
}
