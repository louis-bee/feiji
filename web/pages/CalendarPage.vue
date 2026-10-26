<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  ChevronLeft,
  ChevronRight,
  PenLine,
  CalendarDays,
  Heart,
  Cake,
} from "lucide-vue-next";
import {
  state,
  today,
  hasUnreadOn,
  markDateRead,
  unreadEntries,
} from "../store";
import { writeEntry } from "../ui";
import {
  dateLabel,
  isDate,
  monthCells,
  shiftMonth,
  addDays,
} from "../../shared/dates";
import EntryCard from "../components/EntryCard.vue";
import type { Actor } from "../../shared/types";
const router = useRouter();
const route = useRoute();
const selected = ref(today.value);
const month = ref(today.value.slice(0, 7));
const dayPanel = ref<HTMLElement | null>(null);

function scrollToDayPanel() {
  if (!window.matchMedia("(max-width: 1000px)").matches) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  void nextTick(() => {
    const panel = dayPanel.value;
    if (!panel) return;
    const start = window.scrollY;
    const target = Math.max(0, panel.getBoundingClientRect().top + start - 8);
    const distance = target - start;
    if (reduced || Math.abs(distance) < 2) {
      window.scrollTo(0, target);
      return;
    }
    const duration = 900; // 设置滚动时长
    const from = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - from) / duration);
      const eased = 1 - (1 - progress) ** 3;
      window.scrollTo(0, start + distance * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
watch(
  () => route.query.date,
  (value) => {
    if (typeof value === "string" && isDate(value) && value <= "2099-12-31") {
      selected.value = value;
      month.value = value.slice(0, 7);
    }
  },
  { immediate: true },
);
const cells = computed(() => monthCells(month.value));
const records = computed(() =>
  state.entries
    .filter((e) => e.date === selected.value)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
);
// 翻页箭头的底色提示：哪一侧还有没看的月份，按钮就亮起来，颜色跟着记录是谁写的
function unreadRolesIn(test: (month: string) => boolean) {
  const roles = new Set<Actor>();
  for (const entry of unreadEntries.value) {
    if (test(entry.date.slice(0, 7))) roles.add(entry.authorId);
  }
  return roles;
}
function navClass(roles: Set<Actor>) {
  if (roles.size === 0) return "";
  if (roles.size > 1) return "unread-both";
  return roles.has("him") ? "unread-him" : "unread-her";
}
const prevUnread = computed(() => unreadRolesIn((item) => item < month.value));
const nextUnread = computed(() => unreadRolesIn((item) => item > month.value));
const prevNavClass = computed(() => navClass(prevUnread.value));
const nextNavClass = computed(() => navClass(nextUnread.value));
// 选中某一天就等于看过那天的记录，顺手清掉它的未读
watch(
  records,
  () => {
    if (records.value.length) void markDateRead(selected.value);
  },
  { immediate: true, flush: "post" },
);
function eventsOn(date: string) {
  const result: { title: string; kind: "birthday" | "event" }[] = [];
  for (const p of state.profiles) {
    if (date >= p.birthday && date.slice(5) === p.birthday.slice(5)) {
      result.push({ title: `${p.nickname}的生日`, kind: "birthday" });
    }
  }
  if (
    date >= state.settings.startDate &&
    date.slice(5) === state.settings.startDate.slice(5)
  ) {
    result.push({
      title: date === state.settings.startDate ? "我们开始的那天" : "恋爱周年",
      kind: "event",
    });
  }
  for (const e of state.events) {
    if (
      e.repeat === "once"
        ? e.date === date
        : date >= e.date && date.slice(5) === e.date.slice(5)
    ) {
      result.push({ title: e.title, kind: "event" });
    }
  }
  return result;
}
function hasEntryFrom(date: string, id: Actor) {
  return state.entries.some((e) => e.date === date && e.authorId === id);
}
function profileName(id: Actor) {
  return state.profiles.find((p) => p.id === id)?.nickname ?? id;
}
function entryNote(date: string) {
  const names = state.profiles
    .filter((p) => hasEntryFrom(date, p.id))
    .map((p) => p.nickname);
  return names.length ? `${names.join("、")}有记录` : "";
}
function unreadNote(date: string) {
  const names = state.profiles
    .filter((p) => hasUnreadOn(date, p.id))
    .map((p) => p.nickname);
  return names.length ? `，${names.join("、")}有未读` : "";
}
function selectDate(date: string, options?: { scroll?: boolean }) {
  if (!isDate(date) || date > "2099-12-31") return;
  selected.value = date;
  if (!date.startsWith(month.value)) {
    month.value = date.slice(0, 7);
  }
  void router.replace({ query: { date } });
  if (options?.scroll && records.value.length) scrollToDayPanel();
}
function moveMonth(offset: number) {
  if (!isDate(month.value + "-01")) {
    month.value = today.value.slice(0, 7);
    return;
  }
  const next = shiftMonth(month.value, offset);
  if (next >= "1900-01" && next <= "2099-12") {
    month.value = next;
  }
}
function keyboard(e: KeyboardEvent, date: string) {
  const delta: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  if (e.key in delta) {
    e.preventDefault();
    const next = addDays(date, delta[e.key]);
    selectDate(next);
    setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-date="${next}"]`)
        ?.focus();
    });
  }
}
</script>

<template>
  <section class="page-intro">
    <div>
      <span class="eyebrow">EVERYDAY, WITH YOU</span>
      <h1>每一天，都有迹可循</h1>
      <p>不一定发生大事，平凡的一天也值得记住。</p>
    </div>
    <button type="button" class="button primary" @click="writeEntry()">
      <PenLine :size="17" />记下今天
    </button>
  </section>
  <div class="calendar-layout">
    <section class="calendar-panel">
      <div class="calendar-board">
        <header class="calendar-toolbar">
          <div>
            <button
              :class="['icon-button', prevNavClass]"
              :aria-label="prevUnread.size ? '上个月，还有未读' : '上个月'"
              @click="moveMonth(-1)"
            >
              <ChevronLeft :size="18" />
            </button>
            <button class="text-button" @click="selectDate(today)">今天</button>
            <button
              :class="['icon-button', nextNavClass]"
              :aria-label="nextUnread.size ? '下个月，还有未读' : '下个月'"
              @click="moveMonth(1)"
            >
              <ChevronRight :size="18" />
            </button>
          </div>
        </header>
        <label class="month-picker"
          >翻到某个月<input
            type="month"
            v-model="month"
            min="1900-01"
            max="2099-12"
            aria-label="选择年月"
        /></label>
        <div class="week-labels">
          <span
            v-for="d in ['一', '二', '三', '四', '五', '六', '日']"
            :key="d"
            >{{ d }}</span
          >
        </div>
        <div class="calendar-grid" role="group" aria-label="选择日历日期">
          <button
            v-for="date in cells"
            :key="date"
            :data-date="date"
            :class="[
              'calendar-cell',
              {
                outside: !date.startsWith(month),
                selected: date === selected,
                today: date === today,
              },
            ]"
            :aria-label="`${date}${
              eventsOn(date).length
                ? ' ' +
                  eventsOn(date)
                    .map((e) => e.title)
                    .join('、')
                : ' '
            }${entryNote(date)}${unreadNote(date)}`"
            :aria-pressed="date === today"
            @click="selectDate(date, { scroll: true })"
            @keydown="keyboard($event, date)"
          >
            <span>{{ Number(date.slice(8)) }}</span>
            <div class="day-marks">
              <i
                v-if="hasEntryFrom(date, 'her')"
                :class="[
                  'entry-dot',
                  'her',
                  { unread: hasUnreadOn(date, 'her') },
                ]"
                aria-hidden="true"
              />
              <i
                v-if="hasEntryFrom(date, 'him')"
                :class="[
                  'entry-dot',
                  'him',
                  { unread: hasUnreadOn(date, 'him') },
                ]"
                aria-hidden="true"
              />
              <Cake
                v-if="eventsOn(date).some((e) => e.kind === 'birthday')"
                :size="12"
              />
              <Heart
                v-if="eventsOn(date).some((e) => e.kind === 'event')"
                :size="12"
              />
            </div>
          </button>
        </div>
      </div>
      <footer class="calendar-legend">
        <span><i class="entry-dot her" />{{ profileName("her") }}的记录</span>
        <span><i class="entry-dot him" />{{ profileName("him") }}的记录</span>
        <span><Heart :size="12" />重要日子</span>
        <span><Cake :size="12" />生日</span>
        <span>不必每天写，想记时再来。</span>
      </footer>
    </section>
    <section ref="dayPanel" class="day-panel">
      <header class="day-heading">
        <div>
          <span class="eyebrow">A PAGE OF OUR STORY</span>
          <h2>
            {{ dateLabel(selected)
            }}<small v-if="selected === today">今天</small>
          </h2>
        </div>
        <button
          class="icon-button"
          type="button"
          aria-label="为选中日期写记录"
          @click="writeEntry(selected)"
          :disabled="selected > today"
        >
          <PenLine :size="20" />
        </button>
      </header>
      <div v-if="eventsOn(selected).length" class="day-events">
        <span v-for="item in eventsOn(selected)" :key="item.title">
          <Cake v-if="item.kind === 'birthday'" :size="14" />
          <Heart v-else :size="14" />{{ item.title }}
        </span>
      </div>
      <div v-if="records.length" class="day-records">
        <EntryCard v-for="entry in records" :key="entry.id" :entry="entry" />
      </div>
      <div v-else class="empty-state day-empty">
        <CalendarDays :size="35" stroke-width="1.3" />
        <h3>
          {{
            selected > today ? "把期待，留给未来。" : "这一天，等你留下一笔。"
          }}
        </h3>
        <p>
          {{
            selected > today
              ? "发生之后，再把它写进我们的手账。"
              : "没有特别的事情也没关系，一句话就好。"
          }}
        </p>
        <button
          v-if="selected <= today"
          class="button secondary"
          @click="writeEntry(selected)"
        >
          <PenLine :size="16" />为这一天写点什么
        </button>
      </div>
    </section>
  </div>
</template>
