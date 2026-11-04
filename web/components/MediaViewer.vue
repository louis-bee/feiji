<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-vue-next";
import Model from "../components/Model.vue";
import { state, notify } from "../store";
import { viewerId, viewerScope } from "../ui";
import { api } from "../api";
import type { Media } from "../../shared/types";

// 本次预览可左右切换的列表：按打开时的范围（如某条日历记录）排序
const list = computed(() => {
  if (!viewerScope.value) return state.media;
  const scoped = viewerScope.value
    .map((id) => state.media.find((m) => m.id === id))
    .filter((m): m is Media => !!m);
  return scoped.length ? scoped : state.media;
});
const current = computed(() => state.media.find((m) => m.id === viewerId.value));
// 是否来自记录卡片内的受限范围（此时不循环切换，到边界即隐藏对应按钮）
const scoped = computed(() => !!viewerScope.value);
const index = computed(() => {
  if (!current.value) return -1;
  return list.value.findIndex((m) => m.id === current.value!.id);
});
const hasPrev = computed(() => index.value > 0);
const hasNext = computed(
  () => index.value >= 0 && index.value < list.value.length - 1,
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
  const items = list.value;
  if (!items.length) return;
  const i = index.value;
  if (i < 0) return;
  const next = i + direction;
  if (scoped.value && (next < 0 || next >= items.length)) return;
  viewerId.value = items[(next + items.length) % items.length]?.id || null;
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
        :class="{ 'viewer-nav-hidden': scoped && !hasPrev }"
        aria-label="上一个瞬间"
        :disabled="scoped && !hasPrev"
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
        :class="{ 'viewer-nav-hidden': scoped && !hasNext }"
        aria-label="下一个瞬间"
        :disabled="scoped && !hasNext"
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
