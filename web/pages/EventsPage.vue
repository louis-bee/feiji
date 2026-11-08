<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Plus,
  Heart,
  Cake,
  Flag,
  Pencil,
  Trash2,
  ArrowUpRight,
} from "lucide-vue-next";
import { displayEvents, state, today, notify } from "../store";
import { api } from "../api";
import { dateLabel } from "../../shared/dates";
import { confirmDialog, writeEntry } from "../ui";
import type { EventItem } from "../../shared/types";
import Modal from "../components/Model.vue";

const upcoming = computed(() => displayEvents.value.filter((e) => e.days >= 0));
const past = computed(() =>
  displayEvents.value.filter((e) => e.days < 0).reverse(),
);
const showForm = ref(false);
const editing = ref<EventItem | null>(null);
const form = ref({
  title: "",
  date: today.value,
  repeat: "once" as "once" | "yearly",
  note: "",
});
const error = ref("");
const saving = ref(false);
function open(event: EventItem | null = null) {
  editing.value = event;
  form.value = event
    ? {
        title: event.title,
        date: event.date,
        repeat: event.repeat,
        note: event.note,
      }
    : {
        title: "",
        date: today.value,
        repeat: "once",
        note: "",
      };
  error.value = "";
  showForm.value = true;
}
async function close() {
  if (saving.value) return;
  if (
    (form.value.title || form.value.note) &&
    !(await confirmDialog("关闭编辑？未保存的改动会丢失。", {
      danger: true,
      confirmText: "关闭",
    }))
  )
    return;
  showForm.value = false;
}
async function save() {
  if (!form.value.title.trim()) {
    error.value = "请给这个日子起个名字。";
    return;
  }
  if (!form.value.date) {
    error.value = "请选择日期。";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const event = await api<EventItem>(
      editing.value ? `/api/events/${editing.value.id}` : "/api/events",
      editing.value ? "PATCH" : "POST",
      {
        ...form.value,
        ...(editing.value ? { version: editing.value.version } : {}),
      },
    );
    state.events = [...state.events.filter((e) => e.id !== event.id), event];
    showForm.value = false;
    notify("这个日子，已经记住了");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
async function remove(event: EventItem) {
  if (
    !(await confirmDialog(`删除「${event.title}」？关联的日记不会删除。`, {
      danger: true,
      confirmText: "删除",
    }))
  )
    return;
  try {
    await api(`/api/events/${event.id}?version=${event.version}`, "DELETE");
    state.events = state.events.filter((e) => e.id !== event.id);
    notify("纪念日已删除");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>

<template>
  <section class="page-intro">
    <div>
      <span class="eyebrow">DATES TO REMEMBER</span>
      <h1>有些日子，值得期待</h1>
      <p>生日、周年，还有只属于我们的特别一天。</p>
    </div>
    <button class="button primary" @click="open()">
      <Plus :size="17" />添加纪念日
    </button>
  </section>
  <section class="origin-banner">
    <span class="origin-icon"><Flag :size="26" /></span>
    <div>
      <span class="eyebrow">THE BEGINNING OF US</span>
      <h2>我们开始的那一天</h2>
      <p>
        {{ state.settings.startDate.replaceAll("-", ".") }} · 故事从这里出发
      </p>
    </div>
    <RouterLink
      :to="`/calendar?date=${state.settings.startDate}`"
      class="button secondary"
      >翻到这一天<ArrowUpRight :size="16"
    /></RouterLink>
  </section>
  <div class="section-heading">
    <h2>即将到来</h2>
    <!-- <span class="muted small">只在站内提醒，不会发送通知</span> -->
  </div>
  <div class="events-grid">
    <article
      v-for="event in upcoming"
      :key="event.id"
      :class="['event-ticket', { 'is-today': event.days === 0 }]"
    >
      <div class="event-top">
        <span
          :class="['event-icon', { birthday: event.id.startsWith('birthday') }]"
          ><Cake v-if="event.id.startsWith('birthday')" :size="24" /><Heart
            v-else
            :size="24"
        /></span>
        <span class="event-type">{{
          event.repeat === "yearly" ? "每年都记得" : "特别的一天"
        }}</span>
      </div>
      <h3>{{ event.title }}</h3>
      <p>{{ dateLabel(event.nextDate, true) }}</p>
      <div class="event-count">
        <b>{{ event.days === 0 ? "就是今天" : event.days }}</b
        ><span v-if="event.days !== 0">天后</span>
      </div>
      <p class="event-note">{{ event.note || "把这一天，好好留在心里。" }}</p>
      <footer>
        <RouterLink v-if="event.builtIn" to="/settings" class="text-button"
          >修改日期<Pencil :size="12"
        /></RouterLink>
        <div v-else class="button-row">
          <button class="text-button" @click="open(event)">
            编辑<Pencil :size="12" />
          </button>
          <button class="text-button danger" @click="remove(event)">
            删除<Trash2 :size="12" />
          </button>
        </div>
        <button
          v-if="event.days === 0"
          class="text-button"
          @click="writeEntry()"
        >
          记录今天<ArrowUpRight :size="14" />
        </button>
      </footer>
    </article>
  </div>
  <section v-if="past.length" class="past-events">
    <div class="section-heading"><h2>已经走过</h2></div>
    <article v-for="event in past" :key="event.id">
      <span class="past-date">{{ event.date.replaceAll("-", ".") }}</span>
      <div>
        <strong>{{ event.title }}</strong>
        <p>{{ event.note }}</p>
      </div>
      <button
        class="icon-button"
        aria-label="编辑过去的纪念日"
        @click="open(event)"
      >
        <Pencil :size="16" />
      </button>
      <button
        class="icon-button"
        aria-label="删除过去的纪念日"
        @click="remove(event)"
      >
        <Trash2 :size="16" />
      </button>
      <RouterLink
        v-if="event.builtIn"
        :to="`/calendar?date=${event.date}`"
        class="icon-button"
        aria-label="查看当天记录"
      >
        <ArrowUpRight :size="18" />
      </RouterLink>
    </article>
  </section>
  <Modal
    v-if="showForm"
    :title="editing ? '修改这个日子' : '记住一个特别的日子'"
    :busy="saving"
    @close="close"
  >
    <form class="form-stack" novalidate @submit.prevent="save">
      <label
        >纪念日名称<input
          v-model="form.title"
          aria-label="纪念日名称"
          placeholder="给这个日子起个名字"
          maxlength="120"
          required
      /></label>
      <label
        >日期<input
          v-model="form.date"
          aria-label="纪念日日期"
          type="date"
          min="1900-01-01"
          max="2099-12-31"
          required
      /></label>
      <label>
        怎样记住<select v-model="form.repeat" aria-label="纪念日重复方式">
          <option value="once">仅这一天</option>
          <option value="yearly">每年这一天</option>
        </select>
      </label>
      <p
        v-if="form.date.endsWith('-02-29') && form.repeat === 'yearly'"
        class="field-hint"
      >
        2 月 29 日将仅在闰年出现，不自动改到其他日期。
      </p>
      <label
        >给这一天的话<textarea
          v-model="form.note"
          aria-label="纪念日说明"
          rows="3"
          maxlength="2000"
          placeholder="选填，写一句话期待。"
        />
      </label>
      <p v-if="error" role="alert" class="error-text">{{ error }}</p>
      <footer class="form-footer">
        <button
          type="button"
          class="button secondary"
          :disabled="saving"
          @click="close"
        >
          取消
        </button>
        <button class="button primary" :disabled="saving">
          {{ saving ? "正在保存…" : "保存纪念日" }}
        </button>
      </footer>
    </form>
  </Modal>
</template>

<style scoped>
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 19px;

  .eyebrow {
    font-size: 8px;
    letter-spacing: 0.18em;
    margin-bottom: 5px;
  }

  h2 {
    font-size: 19px;
  }

  > .text-button {
    font-size: 10px;
  }
}
.origin-banner {
  display: flex;
  align-items: center;
  gap: 22px;
  background: #e8ecde;
  border: 1px solid #d9e0cb;
  border-radius: 13px;
  padding: 27px 30px;
  margin-bottom: 32px;

  > div {
    flex: 1;
  }

  .eyebrow {
    font-size: 9px;
  }

  h2 {
    font-size: 20px;
    margin: 5px 0;
  }

  p {
    font-size: 12px;
    color: #889677;
  }
}
.origin-icon {
  width: 59px;
  height: 59px;
  border: 1px dashed #b6c1a3;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #7e9566;
}
.events-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}
.event-ticket {
  position: relative;
  background: #fffdf7;
  border: 1px solid #e1e3d3;
  border-radius: 12px;
  padding: 24px 24px 0;
  min-width: 0;
  overflow: hidden;

  &:before,
  &:after {
    content: "";
    width: 18px;
    height: 18px;
    background: var(--paper);
    border: 1px solid #e1e3d3;
    border-radius: 50%;
    position: absolute;
    bottom: 42px;
    left: -10px;
  }

  &:after {
    left: auto;
    right: -10px;
  }

  h3 {
    font-size: 17px;
    overflow-wrap: anywhere;
  }

  > p {
    font-size: 11px;
    color: #65715f;
    line-height: 1.8;
    margin-top: 5px;

    &.event-note {
      min-height: 37px;
      margin: 12px 0 20px;
      font-size: 10px;
      overflow-wrap: anywhere;
    }
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px dashed #dce2cd;
    min-height: 52px;
    gap: 8px;

    .text-button {
      font-size: 10px;
    }
  }

  &.is-today {
    border-color: #c4ac76;
    background: #fff8e8;

    .event-count b {
      font-size: 30px;
      color: #ac8c48;
    }
  }
}
.event-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 8px;
}
.event-icon {
  width: 45px;
  height: 45px;
  background: #eaf0e0;
  color: #8d9e79;
  border-radius: 12px;
  display: grid;
  place-items: center;

  &.birthday {
    background: #f4ecda;
    color: #b1965d;
  }
}
.event-type {
  font-size: 9px;
  letter-spacing: 0.05em;
  color: #9b9f8a;
}
.event-count {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 23px;

  b {
    font-family: Georgia, serif;
    font-size: 48px;
    font-weight: 400;
    color: #5b7750;
  }

  span {
    font-size: 11px;
    color: #9b9f89;
  }
}
.past-events {
  margin-top: 35px;

  article {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 19px 0;
    border-top: 1px solid #e1e4d6;

    > div {
      flex: 1;
    }
  }

  strong {
    font-size: 13px;
  }

  p {
    font-size: 11px;
    color: #939d87;
    margin-top: 5px;
  }
}
.past-date {
  font-size: 11px;
  font-family: monospace;
  color: #8e9a7d;
}
@media (max-width: 1200px) {
  .events-grid {
    gap: 15px;
  }
  .event-ticket {
    padding: 19px 19px 0;
  }
  .event-count b {
    font-size: 42px;
  }
}
@media (max-width: 1000px) {
  .events-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .section-heading h2 {
    font-size: 17px;
  }
  .section-heading > .text-button {
    font-size: 9px;
  }
  .origin-banner {
    padding: 23px;
    gap: 16px;
  }
  .origin-icon {
    width: 45px;
    height: 45px;
  }
  .origin-banner > .button {
    font-size: 11px;
    padding: 10px;
  }
}
@media (max-width: 760px) {
  .origin-banner {
    padding: 20px;
    flex-wrap: wrap;
    gap: 14px;
  }
  .origin-banner .button {
    margin-left: 58px;
  }
  .events-grid {
    gap: 17px;
  }
  .event-ticket {
    padding: 21px 20px 0;
  }
  .event-top {
    margin-bottom: 22px;
  }
  .event-ticket h3 {
    font-size: 16px;
  }
  .event-count b {
    font-size: 43px;
  }
}
@media (max-width: 540px) {
  .events-grid {
    grid-template-columns: 1fr;
    gap: 19px;
  }
  .event-ticket {
    padding: 23px 26px 0;
  }
  .event-top {
    margin-bottom: 16px;
  }
  .event-ticket h3 {
    font-size: 19px;
  }
  .event-count {
    margin-top: 13px;
  }
  .event-count b {
    font-size: 53px;
  }
  .event-ticket > p.event-note {
    min-height: auto;
    margin-bottom: 24px;
  }
  .event-type {
    font-size: 10px;
  }
  .event-ticket > p {
    font-size: 12px;
  }
  .event-ticket footer .text-button {
    font-size: 11px;
  }
  .origin-banner {
    padding: 21px;
    gap: 14px;
  }
  .origin-banner h2 {
    font-size: 18px;
  }
  .origin-banner p {
    font-size: 11px;
  }
  .origin-banner .eyebrow {
    font-size: 7px;
  }
  .origin-banner .button {
    margin-left: 0;
    width: 100%;
    font-size: 11px;
  }
  .past-events article {
    flex-wrap: wrap;
    gap: 12px;
  }
  .past-date {
    width: 100%;
  }
  .section-heading {
    margin-bottom: 15px;
  }
  .section-heading h2 {
    font-size: 19px;
  }
  .section-heading > .text-button {
    font-size: 11px;
  }
  .section-heading > .small {
    font-size: 9px;
  }
}
</style>
