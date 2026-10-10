<script setup lang="ts">
import { Play, ImageOff } from "lucide-vue-next";
import { ref, watch } from "vue";
import type { Media } from "../types";
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
