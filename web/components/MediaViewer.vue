<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-vue-next";
import Model from "../components/Model.vue";
import { state } from "../store";
import { viewerId } from "../ui";

const current = computed(() =>
  state.media.find((m) => m.id === viewerId.value),
);
const zoom = ref(false);
const error = ref("");
watch(viewerId, () => {
  zoom.value = false;
  error.value = "";
});
function move(direction: number) {
  const index = state.media.findIndex((m) => m.id === viewerId.value);
  viewerId.value =
    state.media[(index + direction + state.media.length) % state.media.length]
      ?.id || null;
}
</script>

<template>
  <Model
    v-if="current"
    :title="current.caption || '沿途的一个瞬间'"
    wide
    @close="viewerId = null"
  >
    <div :class="['media-stage', { zoomed: zoom }]">
      <img
        v-if="current.kind === 'image'"
        :key="current.id"
        :src="current.url"
        :alt="current.caption || current.name"
        @dblclick="zoom = !zoom"
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
          v-if="current.kind === 'image'"
          type="button"
          class="icon-button"
          :aria-label="zoom ? '缩小图片' : '放大图片'"
          @click="zoom = !zoom"
        >
          <ZoomOut v-if="zoom" />
          <ZoomIn v-else />
        </button>
        <button
          type="button"
          class="icon-button"
          aria-label="下一个瞬间"
          @click="move(1)"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  </Model>
</template>
