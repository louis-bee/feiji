import { computed, reactive, ref } from "vue";
import { api } from "./api";
import { SESSION_KEY } from "./config";
import { dayDiff, nextOccurrence, todayInZone } from "../shared/dates";
import type { Actor, Bootstrap, DisplayEvent } from "../shared/types";

function savedActor(): Actor | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value === "her" || value === "him" ? value : null;
  } catch {
    return null;
  }
}
export const actor = ref<Actor | null>(savedActor());
export const state = reactive<Bootstrap>({
  settings: {
    startDate: "2026-06-11",
    timezone: "Asia/Shanghai",
    coverMediaId: null,
    intro: "从这一天起，一起去更远的地方。",
    version: 1,
  },
  profiles: [
    { id: "her", nickname: "飞机", birthday: "2006-10-25" },
    { id: "him", nickname: "大黄丰", birthday: "2004-08-11" },
  ],
  entries: [],
  media: [],
  albums: [],
  events: [],
});
export const loaded = ref(false);
export const loading = ref(false);
export const loadError = ref("");
export const clock = ref(new Date());
export const today = computed(() =>
  todayInZone(state.settings.timezone, clock.value),
);
export const togetherDays = computed(
  () => dayDiff(state.settings.startDate, today.value) + 1,
);
export const names = computed(() =>
  state.profiles.map((p) => p.nickname).join(" × "),
);
export const currentProfile = computed(() =>
  state.profiles.find((p) => p.id === actor.value),
);
export const notice = ref("");

let noticeTimer: ReturnType<typeof setTimeout>;
export function notify(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.value = "";
  }, 4000);
}

let pending: Promise<void> | null = null;
export function refresh(): Promise<void> {
  if (pending) return pending;
  loading.value = true;
  pending = api<Bootstrap>("/api/bootstrap")
    .then((data) => {
      if (!actor.value) return;
      Object.assign(state, data);
      loaded.value = true;
      loadError.value = "";
    })
    .catch((e) => {
      loadError.value = e.message;
    })
    .finally(() => {
      loading.value = false;
      pending = null;
    });
  return pending;
}

export function enter(value: Actor) {
  actor.value = value;
  sessionStorage.setItem(SESSION_KEY, value);
}

export function leave() {
  actor.value = null;
  sessionStorage.removeItem(SESSION_KEY);
  state.entries = [];
  state.media = [];
  state.albums = [];
  state.events = [];
  loaded.value = false;
}

export const displayEvents = computed<DisplayEvent[]>(() => {
  const base = [
    {
      id: "anniversary",
      title: "我们的纪念日",
      date: state.settings.startDate,
      repeat: "yearly" as const,
      note: "从这一天起，一起去更远的地方。",
      version: 0,
      builtIn: true,
    },
    ...state.profiles.map((p) => ({
      id: `birthday-${p.id}`,
      title: `${p.nickname}的生日`,
      date: p.birthday,
      repeat: "yearly" as const,
      note: "这一天，留给最特别的你。",
      version: 0,
      builtIn: true,
    })),
    ...state.events.map((e) => ({ ...e, builtIn: false })),
  ];
  return base
    .map((e) => {
      let nextDate = nextOccurrence(e.date, today.value, e.repeat);
      if (e.id === "anniversary" && nextDate === state.settings.startDate)
        nextDate = nextOccurrence(
          e.date,
          `${Number(e.date.slice(0, 4)) + 1}-01-01`,
          "yearly",
        );
      return {
        ...e,
        nextDate,
        days: dayDiff(today.value, nextDate),
      };
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
});
