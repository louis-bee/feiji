export type Actor = "her" | "him";
export interface Profile {
  id: Actor;
  nickname: string;
  birthday: string;
}
export interface Settings {
  startDate: string;
  timezone: string;
  coverMediaId: string | null;
  intro: string;
  version: number;
}
export interface Entry {
  id: string;
  date: string;
  authorId: Actor;
  body: string;
  mediaIds: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Media {
  id: string;
  kind: "image" | "video";
  name: string;
  mime: string;
  width: number | null;
  height: number | null;
  size: number;
  albumId: string | null;
  caption: string;
  date: string | null;
  featured: boolean;
  url: string;
  thumbUrl: string | null;
  version: number;
  createdAt: string;
}
export interface Album {
  id: string;
  name: string;
  description: string;
  version: number;
}
export interface EventItem {
  id: string;
  title: string;
  date: string;
  repeat: "yearly" | "once";
  note: string;
  version: number;
}
export interface Bootstrap {
  settings: Settings;
  profiles: Profile[];
  entries: Entry[];
  media: Media[];
  albums: Album[];
  events: EventItem[];
}
export interface DisplayEvent extends EventItem {
  builtIn: boolean;
  nextDate: string;
  days: number;
}