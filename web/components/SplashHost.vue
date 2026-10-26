<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { todayInZone } from "../../shared/dates";
import { state } from "../store";
// 同一时间只挂一个开屏：换开屏就换这行 import 和模板里的标签。
import BirthdaySplash, { splash } from "../splash/BirthdaySplash.vue";

/** 开屏页需要的 props，直接从它的 match 返回值推断 */
type SplashProps = NonNullable<ReturnType<typeof splash.match>>;

const reduce =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
/** 与 .splash-host 的淡出时长保持一致 */
const FADE = reduce ? 240 : 720;

/** 命中时是要传给开屏页的 props，没命中就什么都不渲染 */
const splashProps = ref<SplashProps | null>(pick());
const closing = ref(false);

let fadeTimer: ReturnType<typeof setTimeout> | undefined;
let overflow = "";
let locked = false;

function pick(): SplashProps | null {
  const search = typeof location === "undefined" ? "" : location.search;
  if (new URLSearchParams(search).get("splash") === "none") return null;
  return splash.match({
    today: todayInZone(state.settings.timezone),
    search,
  });
}

/** 开屏页请求收起：先淡出，再卸载，滚动条等淡出结束才放回来。 */
function close() {
  if (closing.value || !splashProps.value) return;
  closing.value = true;
  fadeTimer = setTimeout(() => {
    splashProps.value = null;
  }, FADE);
}

function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || !splashProps.value) return;
  event.preventDefault();
  close();
}

function lockScroll(lock: boolean) {
  if (lock === locked) return;
  if (lock) {
    overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = overflow;
  }
  locked = lock;
}

watch(splashProps, (value) => lockScroll(Boolean(value)), { immediate: true });

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => {
  clearTimeout(fadeTimer);
  window.removeEventListener("keydown", onKey);
  lockScroll(false);
});
</script>

<template>
  <div v-if="splashProps" class="splash-host" :class="{ leaving: closing }">
    <BirthdaySplash v-bind="splashProps" :leaving="closing" @close="close" />
  </div>
</template>

<style scoped>
.splash-host {
  position: fixed;
  inset: 0;
  z-index: 10000;
  overflow: hidden;
  /* 首帧就是完整画面，不做淡入，避免露出底下的页面 */
  transition: opacity 0.72s cubic-bezier(0.4, 0, 0.2, 1);
}
.splash-host.leaving {
  opacity: 0;
  pointer-events: none;
}
</style>
