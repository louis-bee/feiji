<script setup lang="ts">
import { computed, ref } from "vue";
import { Pencil, Trash2, Image as ImageIcon } from "lucide-vue-next";
import { state, actor, notify } from "../store";
import { writeEntry, viewerId } from "../ui";
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
const deleting = ref(false);
const error = ref("");
async function remove() {
  if (!confirm("删除这条记录？关联的图片和视频仍保留在相册中。")) return;
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
        <span
          >{{ dateLabel(entry.date, true) }}
          <small v-if="entry.updatedAt !== entry.createdAt">· 已编辑</small>
        </span>
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
        v-for="item in media.slice(0, compact ? 3 : media.length)"
        :key="item.id"
        type="button"
        :aria-label="`查看${item.caption || item.name}`"
        @click="viewerId = item.id"
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
