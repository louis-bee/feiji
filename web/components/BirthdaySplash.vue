<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { X } from "lucide-vue-next";
import type { SplashMode } from "../birthday";

const props = defineProps<{ mode: SplashMode }>();
const emit = defineEmits<{ done: [] }>();

const reduce =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const FADE = reduce ? 240 : 720;

const leaving = ref(false);
let fadeTimer: ReturnType<typeof setTimeout> | undefined;
let overflow = "";

/** 动画播完后停在原地，由右上角的叉决定什么时候收起。 */
function finish() {
  if (leaving.value) return;
  leaving.value = true;
  fadeTimer = setTimeout(() => emit("done"), FADE);
}

function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  finish();
}

onMounted(() => {
  overflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", onKey);
});

/* 滚动条要等淡出结束再放回来，否则登录页会先跳一下 */
onUnmounted(() => {
  clearTimeout(fadeTimer);
  window.removeEventListener("keydown", onKey);
  document.body.style.overflow = overflow;
});

const chars = computed(() => [..."林至彦，生日快乐"]);

const copy = computed(() =>
  props.mode === "day"
    ? {
        eyebrow: "OCT 25 / HAPPY BIRTHDAY",
        sub: "愿你天天开心，为所欲为。",
      }
    : {
        eyebrow: "OCT 24 / THE NIGHT BEFORE",
        sub: "还有几个小时就是你的生日了，先偷偷说一声。",
        sign: "—— 提前一点点的生日快乐",
      },
);

const stars = [
  { x: 9, y: 22, size: 4, delay: 0 },
  { x: 18, y: 68, size: 3, delay: 0.6 },
  { x: 26, y: 34, size: 2, delay: 1.2 },
  { x: 38, y: 82, size: 3, delay: 0.3 },
  { x: 47, y: 16, size: 2, delay: 1.8 },
  { x: 58, y: 74, size: 4, delay: 0.9 },
  { x: 69, y: 28, size: 2, delay: 2.1 },
  { x: 77, y: 58, size: 3, delay: 1.5 },
  { x: 88, y: 20, size: 2, delay: 0.4 },
  { x: 92, y: 72, size: 3, delay: 2.4 },
];

const confetti = [
  { x: 6, delay: 2.3, drift: 14, tone: "honey" },
  { x: 15, delay: 2.6, drift: -10, tone: "leaf" },
  { x: 24, delay: 2.45, drift: 20, tone: "paper" },
  { x: 33, delay: 2.75, drift: -16, tone: "honey" },
  { x: 43, delay: 2.35, drift: 8, tone: "leaf" },
  { x: 52, delay: 2.85, drift: 18, tone: "honey" },
  { x: 61, delay: 2.5, drift: -12, tone: "paper" },
  { x: 70, delay: 2.65, drift: 22, tone: "leaf" },
  { x: 79, delay: 2.4, drift: -18, tone: "honey" },
  { x: 87, delay: 2.9, drift: 10, tone: "paper" },
  { x: 94, delay: 2.55, drift: -14, tone: "leaf" },
];
</script>

<template>
  <section
    class="birthday-splash"
    :class="{ leaving, reduced: reduce }"
    aria-label="飞机，生日快乐"
  >
    <div class="splash-wash" aria-hidden="true" />
    <div class="splash-stars" aria-hidden="true">
      <span
        v-for="(star, i) in stars"
        :key="`star-${i}`"
        :style="`left:${star.x}%;top:${star.y}%;--size:${star.size}px;--delay:${star.delay}s`"
      />
    </div>

    <div class="splash-inner">
      <svg
        class="splash-scene"
        viewBox="0 0 360 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="splash-ink" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#c7a267" />
            <stop offset="1" stop-color="#c7a267" stop-opacity="0.28" />
          </linearGradient>
          <mask
            id="splash-reveal"
            maskUnits="userSpaceOnUse"
            x="-10"
            y="-10"
            width="380"
            height="240"
          >
            <path
              class="splash-reveal-path"
              pathLength="1"
              d="M 8 202 C 84 184 96 118 174 104 S 272 56 330 44"
              stroke="#fff"
              stroke-width="10"
              stroke-linecap="round"
            />
          </mask>
        </defs>

        <path
          id="splash-trail"
          class="splash-trail"
          d="M 8 202 C 84 184 96 118 174 104 S 272 56 330 44"
          stroke="url(#splash-ink)"
          stroke-width="1.8"
          stroke-dasharray="4 8"
          stroke-linecap="round"
          mask="url(#splash-reveal)"
        />

        <g class="splash-plane">
          <animateMotion
            v-if="!reduce"
            dur="1.45s"
            begin="0.32s"
            fill="freeze"
            rotate="auto"
            calcMode="spline"
            keyPoints="0;1"
            keyTimes="0;1"
            keySplines="0.45 0 0.2 1"
          >
            <mpath href="#splash-trail" />
          </animateMotion>
          <g :transform="reduce ? 'translate(330 44) rotate(-14)' : ''">
            <path
              d="M-13 9 16 0-13-9-6 0Z"
              fill="#fffaf2"
              stroke="#3f6157"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path
              d="M-6 0 9 0"
              stroke="#3f6157"
              stroke-width="1.1"
              opacity="0.45"
            />
          </g>
        </g>
      </svg>

      <div class="splash-copy">
        <span class="splash-eyebrow">{{ copy.eyebrow }}</span>
        <h2 class="splash-title">
          <span
            v-for="(char, i) in chars"
            :key="`char-${i}`"
            :style="`--i:${i}`"
            >{{ char }}</span
          >
        </h2>
        <p class="splash-sub">{{ copy.sub }}</p>
        <span class="splash-underline" aria-hidden="true" />
        <small class="splash-sign">{{ copy.sign }}</small>
      </div>
    </div>

    <div class="splash-confetti" aria-hidden="true">
      <span
        v-for="(bit, i) in confetti"
        :key="`bit-${i}`"
        :class="bit.tone"
        :style="`left:${bit.x}%;--delay:${bit.delay}s;--drift:${bit.drift}px`"
      />
    </div>

    <button
      type="button"
      class="splash-close"
      aria-label="收起生日开屏"
      @click="finish"
    >
      <X :size="17" />
    </button>
  </section>
</template>
