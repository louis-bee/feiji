<script setup lang="ts">
import { Play, ImageOff } from "lucide-vue-next";
import { ref, watch } from "vue";
import type { Media } from "../../shared/types";
const props = defineProps<{
  media: Media;
  eager?: boolean;
}>();

const failed = ref(false);
watch(
  () => props.media.url,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <div :class="['media-thumb', { 'video-thumb': media.kind === 'video' }]">
    <template v-if="media.kind === 'image'">
      <img
        v-if="!failed"
        :src="media.thumbUrl || media.url"
        :alt="media.caption || media.name"
        :loading="eager ? 'eager' : 'lazy'"
        @error="failed = true"
      /><span v-else class="thumb-fallback"
        ><ImageOff :size="24" />图片暂不可用</span
      >
    </template>
    <span v-else class="video-placeholder">
      <span class="play-circle"><Play :size="22" fill="currentColor" /></span>
      <span>一段动态回忆</span><small>点击播放</small>
    </span>
  </div>
</template>

<style scoped>
.media-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1.15;
  background: #e7ebdf;
  overflow: hidden;
}
.media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.thumb-fallback {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #83947c;
  font-size: 11px;
}
.video-thumb {
  background: linear-gradient(140deg, #b9c9b8, #526e5b);
}
.video-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #f9f6e9;
  font-size: 12px;
}
.play-circle {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid #f9f9e8aa;
  border-radius: 50%;
  background: #e9efdc22;
}
.video-placeholder > small {
  font-size: 9px;
  opacity: 0.7;
}
@media (max-width: 540px) {
  .video-placeholder {
    font-size: 10px;
    gap: 6px;
  }
  .play-circle {
    width: 37px;
    height: 37px;
  }
  .video-placeholder > small {
    font-size: 8px;
  }
}
</style>
