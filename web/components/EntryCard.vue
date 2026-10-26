<script setup lang="ts">
import { computed, ref } from "vue";
import { Pencil, Trash2, Image as ImageIcon } from "lucide-vue-next";
import { state, actor, notify } from "../store";
import { confirmDialog, writeEntry, openViewer } from "../ui";
import { api } from "../api";
import { dateLabel } from "../../shared/dates";
import type { Entry } from "../../shared/types";
import Avatar from "./Avatar.vue";
import MediaThumb from "./MediaThumb.vue";
const props = defineProps<{
  entry: Entry;
  compact?: boolean;
}>();
const profile = computed(() =>
  state.profiles.find((p) => p.id === props.entry.authorId),
);
const media = computed(() =>
  props.entry.mediaIds
    .map((id) => state.media.find((m) => m.id === id))
    .filter((m) => !!m),
);
const shown = computed(() =>
  media.value.slice(0, props.compact ? 3 : undefined),
);
const open = (id: string) =>
  openViewer(
    id,
    shown.value.map((m) => m.id),
  );
const editedLabel = computed(() => {
  const date = new Date(props.entry.updatedAt);
  if (Number.isNaN(date.getTime())) return dateLabel(props.entry.date, true);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
});
const deleting = ref(false);
const error = ref("");
async function remove() {
  if (
    !(await confirmDialog("删除这条记录？关联的图片和视频仍保留在相册中。", {
      danger: true,
      confirmText: "删除",
    }))
  )
    return;
  deleting.value = true;
  try {
    await api(
      `/api/entries/${props.entry.id}?version=${props.entry.version}`,
      "DELETE",
    );
    state.entries = state.entries.filter((e) => e.id !== props.entry.id);
    notify("记录已删除，媒体仍在相册里");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <article :class="['entry-card', { compact }]">
    <header>
      <Avatar :actor="entry.authorId" />
      <div>
        <strong>{{ profile?.nickname }}</strong>
        <span v-if="compact">{{ dateLabel(entry.date, true) }}</span>
        <span v-else>编辑于 {{ editedLabel }}</span>
      </div>
      <div v-if="!compact && actor === entry.authorId" class="entry-actions">
        <button
          type="button"
          class="icon-button"
          aria-label="编辑记录"
          @click="writeEntry(entry.date, entry)"
        >
          <Pencil :size="15" />
        </button>
        <button
          type="button"
          class="icon-button danger-hover"
          aria-label="删除记录"
          @click="remove"
          :disabled="deleting"
        >
          <Trash2 :size="15" />
        </button>
      </div>
    </header>
    <p v-if="entry.body" :class="['entry-body', { clamped: compact }]">
      {{ entry.body }}
    </p>
    <div v-if="media.length" :class="['entry-images', { small: compact }]">
      <button
        v-for="item in shown"
        :key="item.id"
        type="button"
        :aria-label="`查看${item.caption || item.name}`"
        @click="open(item.id)"
      >
        <MediaThumb :media="item" />
      </button>
    </div>
    <RouterLink
      v-if="compact"
      class="entry-link"
      :to="`/calendar?date=${entry.date}`"
    >
      翻到这一天<span>↗</span>
    </RouterLink>
    <P v-if="error" class="error-text" role="alert">{{ error }}</P>
  </article>
</template>
