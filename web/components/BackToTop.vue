<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ArrowUpToLine } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    /** 向上回滚达到该距离才显示（同时用作「距底部多远即显示」的阈值） */
    threshold?: number;
    /** 距离顶部多少像素以内不显示 */
    topThreshold?: number;
  }>(),
  {
    threshold: 100,
    topThreshold: 0,
  },
);

const show = ref(false);
let lastY = window.scrollY;
let anchor = window.scrollY;
let hidingToTop = false;

function onScroll() {
  const y = window.scrollY;
  const goingUp = y < lastY;
  const distanceToBottom =
    document.documentElement.scrollHeight - (y + window.innerHeight);
  const nearBottom = distanceToBottom <= props.threshold;
  if (hidingToTop) {
    show.value = false;
    if (y <= 0 || !goingUp) hidingToTop = false;
  } else if (y <= props.topThreshold) {
    show.value = false;
  } else if (!goingUp) {
    anchor = y;
    show.value = nearBottom;
  } else {
    show.value = anchor - y >= props.threshold || nearBottom;
  }
  lastY = y;
}

function scrollToTop() {
  show.value = false;
  hidingToTop = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  lastY = window.scrollY;
  window.addEventListener("scroll", onScroll, { passive: true });
});
onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <Transition name="back-top">
    <button
      v-if="show"
      class="back-to-top"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <ArrowUpToLine :size="18" />
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  right: 30px;
  bottom: 24px;
  width: 44px;
  height: 44px;
  border-radius: 7px;
  background: rgba(58, 58, 58, 0.72);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 14px #0000001f;
  z-index: 40;
}
@media (hover: hover) {
  .back-to-top:hover {
    background: rgba(40, 40, 40, 0.92);
  }
}
.back-top-enter-active,
.back-top-leave-active {
  transition: opacity 0.2s ease;
}
.back-top-enter-from,
.back-top-leave-to {
  opacity: 0;
}
@media (max-width: 760px) {
  .back-to-top {
    bottom: calc(84px + env(safe-area-inset-bottom));
  }
}
</style>
