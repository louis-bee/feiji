<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
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
// 从首页卡片点进来时，滚到那条记录并闪烁两下
const flashId = ref("");
let flashTimer = 0;
let flashStartTimer = 0;
function startFlash(id: string) {
  window.clearTimeout(flashTimer);
  flashId.value = id;
  flashTimer = window.setTimeout(() => {
    if (flashId.value === id) flashId.value = "";
  }, 800);
}
async function revealEntry(id: string) {
  await nextTick();
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  const card = document.querySelector<HTMLElement>(
    `[data-entry-id="${CSS.escape(id)}"]`,
  );
  if (!card) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const margin = 96;
  const rect = card.getBoundingClientRect();
  let delay = 0;
  if (rect.top < margin || rect.bottom > window.innerHeight - margin) {
    window.scrollTo({
      top: Math.max(0, rect.top + window.scrollY - margin),
      behavior: reduced ? "auto" : "smooth",
    });
    // 等滚动靠近了再闪，避免提示被滚动过程吃掉
    delay = reduced ? 0 : 400;
  }
  window.clearTimeout(flashStartTimer);
  window.clearTimeout(flashTimer);
  flashStartTimer = window.setTimeout(() => startFlash(id), delay);
}
watch(
  () => route.query.entry,
  (value) => {
    const id = typeof value === "string" ? value : "";
    if (!id || !records.value.some((e) => e.id === id)) {
      flashId.value = "";
      return;
    }
    void revealEntry(id);
  },
  { immediate: true },
);
onUnmounted(() => {
  window.clearTimeout(flashTimer);
  window.clearTimeout(flashStartTimer);
});
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
        <span
          ><i class="entry-dot her" /><i class="entry-dot him" />有记录</span
        >
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
        <EntryCard
          v-for="entry in records"
          :key="entry.id"
          :entry="entry"
          :flash="entry.id === flashId"
        />
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

<style scoped>
.calendar-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 25px;
  align-items: start;
}
.calendar-panel {
  padding: 25px;
  background: #fffdf6;
  border: 1px solid var(--line);
  border-radius: 14px;
}
.calendar-board {
  position: relative;
}
.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.calendar-toolbar h2 {
  font-size: 20px;
}
.calendar-toolbar small {
  display: block;
  font-size: 10px;
  color: #8e9782;
  margin-top: 5px;
}
.calendar-toolbar > div:last-child {
  display: flex;
  align-items: center;
}
.calendar-toolbar .text-button {
  font-size: 11px;
  padding: 0 8px;
}
/* 那一侧还有没看的月份：按钮底色浅一度，按记录是谁写的换色，hover 再深一档 */
.calendar-toolbar .icon-button.unread-her,
.calendar-toolbar .icon-button.unread-him,
.calendar-toolbar .icon-button.unread-both {
  background: var(--nav-tint);
}
.calendar-toolbar .icon-button.unread-her {
  --nav-tint: #e6ead9;
  --nav-tint-deep: #dde3ce;
}
.calendar-toolbar .icon-button.unread-him {
  --nav-tint: #f1e6cd;
  --nav-tint-deep: #e9d9b3;
}
.calendar-toolbar .icon-button.unread-both {
  --nav-tint: linear-gradient(105deg, #e6ead9 0 50%, #f1e6cd 50% 100%);
  --nav-tint-deep: linear-gradient(105deg, #dde3ce 0 50%, #e9d9b3 50% 100%);
}
@media (hover: hover) {
  .calendar-toolbar .icon-button.unread-her:hover,
  .calendar-toolbar .icon-button.unread-him:hover,
  .calendar-toolbar .icon-button.unread-both:hover {
    background: var(--nav-tint-deep);
  }
}
@media (hover: none) {
  .calendar-toolbar .icon-button.unread-her:active,
  .calendar-toolbar .icon-button.unread-him:active,
  .calendar-toolbar .icon-button.unread-both:active {
    background: var(--nav-tint-deep);
  }
}
.month-picker {
  font-size: 10px;
  color: #8c937f;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15px;
  padding-bottom: 13px;
  border-bottom: 1px solid #eeeee2;
}
.month-picker input {
  width: auto;
  background: transparent;
  border: 0;
  min-height: 32px;
  padding: 4px;
  margin: 0;
  font-size: 11px;
  color: #708263;
}
.week-labels {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin: 17px 0 11px;
  text-align: center;
  color: #929a85;
  font-size: 10px;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}
.calendar-cell {
  border-radius: 10px;
  padding: 8px 2px 5px;
  aspect-ratio: 0.87;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  min-width: 0;
}
.calendar-cell > span {
  font-size: 13px;
}
@media (hover: hover) {
  .calendar-cell:hover {
    background: #edf0e4;
  }
}
.calendar-cell.today {
  border-color: #b1bfa0;
}
.calendar-cell.selected {
  background: #3a5d4d;
  color: #fffdf5;
  border-color: #3a5d4d;
}
.calendar-cell.outside:not(.selected) {
  color: #bdc2b2;
}
.day-marks {
  height: 14px;
  display: flex;
  align-items: center;
  gap: 3px;
  color: #b19355;
  margin-top: 4px;
}
.entry-dot {
  width: 4.5px;
  height: 4.5px;
  border-radius: 50%;
  background: var(--dot);
  display: inline-block;
}
/* 这条记录还没看过：同色小点放大一号 */
.entry-dot.unread {
  width: 6.5px;
  height: 6.5px;
}
.entry-dot.her {
  background: var(--dot-her);
}
.entry-dot.her.unread {
  opacity: 0.9;
}
.entry-dot.him {
  background: var(--dot-him);
}
.entry-dot.him.unread {
  opacity: 0.7;
}
.selected .entry-dot.her {
  background: #b7cc9c;
}
.selected .entry-dot.him {
  background: #f0cd85;
}
.selected .day-marks {
  color: #ebd394;
}
.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
  border-top: 1px solid #eceee0;
  padding-top: 16px;
  margin-top: 18px;
  font-size: 9px;
  color: #87947c;
}
.calendar-legend > span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.calendar-legend > span:last-child {
  margin-left: auto;
  font-size: 8px;
}
.day-panel {
  min-width: 0;
}
.day-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 0 16px;
  border-bottom: 1px solid #e0e3d4;
  margin-bottom: 18px;
}
.day-heading h2 {
  font-size: 22px;
  margin-top: 8px;
}
.day-heading h2 small {
  vertical-align: middle;
  margin-left: 12px;
  font-size: 10px;
  background: #e8ecd9;
  color: #738760;
  border-radius: 4px;
  padding: 3px 6px;
}
.day-heading .eyebrow {
  font-size: 8px;
}
.day-events {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.day-events > span {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f0e9d8;
  border: 1px solid #e8ddc5;
  border-radius: 7px;
  font-size: 11px;
  color: #9b8052;
}
.day-records {
  display: grid;
  gap: 15px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 35px 20px;
  min-height: 300px;
  border: 1px dashed #d8ddca;
  border-radius: 12px;
  color: #96a086;
}
.empty-state h3 {
  margin-top: 20px;
  font-size: 16px;
  color: #607355;
}
.empty-state p {
  font-size: 12px;
  margin: 12px 0 20px;
  line-height: 1.9;
}
.day-empty {
  background: #f0f0e480;
}
@media (max-width: 1200px) {
  .calendar-panel {
    padding: 20px;
  }
  .calendar-layout {
    gap: 20px;
    grid-template-columns: 1.1fr 1fr;
  }
  .calendar-cell {
    aspect-ratio: 0.8;
  }
}
@media (max-width: 1000px) {
  .calendar-layout {
    grid-template-columns: 1fr;
  }
  .calendar-cell {
    aspect-ratio: 1.2;
  }
  .calendar-panel {
    max-width: 100%;
  }
  .day-panel {
    margin-top: 4px;
  }
}
@media (max-width: 760px) {
  .calendar-board {
    display: flex;
    flex-direction: column;
  }
  .calendar-toolbar {
    order: 1;
    justify-content: flex-end;
    margin-top: 2px;
  }
  .month-picker {
    margin-top: 0px;
    padding-bottom: 6px;
  }
  .calendar-grid {
    gap: 6px;
  }
  .calendar-cell {
    aspect-ratio: 1.1;
    min-height: 44px;
  }
  .calendar-cell > span {
    font-size: 14px;
  }
  .calendar-panel {
    padding: 20px;
  }
  .calendar-legend {
    margin-top: 4px;
    font-size: 9px;
  }
  .calendar-layout {
    gap: 25px;
  }
  .day-heading {
    padding-top: 4px;
  }
  .day-records {
    gap: 15px;
  }
}
@media (max-width: 540px) {
  .calendar-panel {
    padding: 18px 14px;
  }
  .calendar-toolbar h2 {
    font-size: 18px;
  }
  .calendar-toolbar small {
    font-size: 9px;
  }
  .calendar-toolbar .text-button {
    padding: 0 5px;
  }
  .calendar-toolbar {
    margin-top: 2px;
  }
  .calendar-cell {
    aspect-ratio: 0.86;
    padding: 7px 0 4px;
    border-radius: 8px;
  }
  .calendar-grid {
    gap: 3px;
  }
  .calendar-legend {
    gap: 10px;
    font-size: 8px;
    flex-wrap: wrap;
  }
  .calendar-legend > span:last-child {
    font-size: 8px;
  }
  .day-empty {
    min-height: 280px;
  }
}
@media (hover: none) {
  .calendar-cell:active {
    background: #edf0e4;
  }
  .calendar-cell.selected:active {
    background: #3a5d4d;
  }
}
</style>
