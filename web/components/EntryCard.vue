<script setup lang="ts">
import { computed, ref } from "vue";
import { Pencil, Trash2, Image as ImageIcon } from "lucide-vue-next";
import { state, actor, notify } from "../store";
import { writeEntry, viewerId } from "../ui";
import { api } from "../api";
import { dateLabel } from "../../shared/dates";
import type { Entry } from "../types";
import Avatar from "./Avatar.vue";
import MediaThumb from "./MediaThumb.vue";
const props = defineProps<{
  entry: Entry;
  compact?: boolean;
}>();
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
    <header></header>
  </article>
</template>
