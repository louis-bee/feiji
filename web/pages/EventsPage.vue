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
import { writeEntry } from "../ui";
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
function close() {
  if (saving.value) return;
  if (
    (form.value.title || form.value.note) &&
    !confirm("关闭编辑？未保存的改动会丢失。")
  )
    return;
  showForm.value = false;
}
async function save() {
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
  if (!confirm(`删除「${event.title}」？关联的日记不会删除。`)) return;
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
      <h1>有些日子，值得期待<span class="title-dot">.</span></h1>
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
    <span class="muted small">只在站内提醒，不会发送通知</span>
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
    <form class="form-stack" @submit.prevent="save">
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
