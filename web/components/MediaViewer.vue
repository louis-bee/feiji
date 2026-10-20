<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-vue-next";
import Model from "../components/Model.vue";
import { state, notify } from "../store";
import { viewerId } from "../ui";
import { api } from "../api";
import type { Media } from "../../shared/types";

const current = computed(() =>
  state.media.find((m) => m.id === viewerId.value),
);
const fullscreen = ref(false);
const error = ref("");
const isTouch =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;
watch(viewerId, () => {
  fullscreen.value = false;
  error.value = "";
});
function openFullscreen() {
  if (current.value?.kind === "image") fullscreen.value = true;
}
function closeFullscreen() {
  fullscreen.value = false;
}
function doubleTap(fn: () => void) {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last < 320) {
      last = 0;
      fn();
    } else {
      last = now;
    }
  };
}
// 移动端单击进入/退出全屏，桌面端保持双击
const openImageFullscreen = isTouch ? openFullscreen : doubleTap(openFullscreen);
const closeImageFullscreen = isTouch
  ? closeFullscreen
  : doubleTap(closeFullscreen);
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeFullscreen();
}
watch(fullscreen, (open) => {
  if (open) document.addEventListener("keydown", handleKeydown);
  else document.removeEventListener("keydown", handleKeydown);
});
onBeforeUnmount(() => document.removeEventListener("keydown", handleKeydown));
function move(direction: number) {
  const index = state.media.findIndex((m) => m.id === viewerId.value);
  viewerId.value =
    state.media[(index + direction + state.media.length) % state.media.length]
      ?.id || null;
}
const toggling = ref(false);
async function toggleFeatured() {
  const media = current.value;
  if (!media || toggling.value) return;
  toggling.value = true;
  try {
    const updated = await api<Media>(`/api/media/${media.id}`, "PATCH", {
      albumId: media.albumId,
      caption: media.caption,
      date: media.date,
      featured: !media.featured,
      version: media.version,
    });
    state.media = state.media.map((value) =>
      value.id === updated.id ? updated : value,
    );
  } catch (e) {
    notify((e as Error).message);
  } finally {
    toggling.value = false;
  }
}
</script>

<template>
  <Model
    v-if="current"
    :title="current.caption || '沿途的一个瞬间'"
    wide
    @close="viewerId = null"
  >
    <template #title-suffix>
      <button
        type="button"
        :class="['viewer-favorite', { selected: current.featured }]"
        :aria-label="current.featured ? '取消精选' : '设为精选'"
        :aria-pressed="current.featured"
        :disabled="toggling"
        @click="toggleFeatured"
      >
        <Heart :size="18" :fill="current.featured ? 'currentColor' : 'none'" />
      </button>
    </template>
    <div class="media-stage">
      <img
        v-if="current.kind === 'image'"
        :key="current.id"
        :src="current.url"
        :alt="current.caption || current.name"
        @click="openImageFullscreen"
        @error="error = '图片暂时无法加载，请检查连接后重试。'"
      />
      <video
        v-else
        :key="`video-${current.id}`"
        :src="current.url"
        controls
        playsinline
        preload="metadata"
        @error="
          error =
            '当前浏览器无法播放此视频。请确认格式为 MP4（H.264 / AAC），或尝试使用其他浏览器；本站不支持自动转码。'
        "
      />
      <div class="media-error" v-if="error">{{ error }}</div>
    </div>
    <div class="viewer-footer">
      <button
        type="button"
        class="icon-button"
        aria-label="上一个瞬间"
        @click="move(-1)"
      >
        <ChevronLeft />
      </button>
      <span
        >{{ current.date || "未标日期"
        }}<small>{{ current.name }}</small></span
      >
      <button
        type="button"
        class="icon-button"
        aria-label="下一个瞬间"
        @click="move(1)"
      >
        <ChevronRight />
      </button>
    </div>
    <div
      v-if="fullscreen && current.kind === 'image'"
      class="fullscreen-viewer"
      @click.self="closeFullscreen"
    >
      <img
        :src="current.url"
        :alt="current.caption || current.name"
        @click="closeImageFullscreen"
      />
      <button
        type="button"
        class="icon-button fullscreen-close"
        aria-label="退出全屏"
        @click="closeFullscreen"
      >
        <X :size="24" />
      </button>
      <span class="fullscreen-hint">{{
        isTouch ? "单击图片、点击空白处或按 Esc 退出全屏" : "双击图片、点击空白处或按 Esc 退出全屏"
      }}</span>
    </div>
  </Model>
</template>
