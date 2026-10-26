<script lang="ts">
/** eve = 生日前夜，day = 生日当天 */
export type SplashMode = "eve" | "day";

/** 生日开屏：只在生日前夜（10-24）和生日当天（10-25）出现。 */
const BIRTHDAY_MONTH = "10";
const BIRTHDAY_DAY = 25;

function birthdayMode(today: string): SplashMode | null {
  if (today.slice(5, 7) !== BIRTHDAY_MONTH) return null;
  const day = Number(today.slice(8, 10));
  if (day === BIRTHDAY_DAY) return "day";
  if (day === BIRTHDAY_DAY - 1) return "eve";
  return null;
}

/** 宿主用它决定今天放不放这个开屏；?splash=birthday 可强制预览。 */
export const splash = {
  match({ today, search }: { today: string; search: string }) {
    const mode = birthdayMode(today);
    if (new URLSearchParams(search).get("splash") === "birthday")
      return { mode: mode ?? "day" };
    return mode ? { mode } : null;
  },
};
</script>

<script setup lang="ts">
import { computed } from "vue";
import { X } from "lucide-vue-next";

const props = defineProps<{ mode: SplashMode; leaving: boolean }>();
const emit = defineEmits<{ close: [] }>();

const reduce =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 动画播完后停在原地，由右上角的叉决定什么时候收起；淡出与卸载交给宿主。 */
function finish() {
  if (props.leaving) return;
  emit("close");
}

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

<style scoped>
/* ── 生日开屏：10.24 前夜 / 10.25 当天 ───────────────────────── */
/* 铺满宿主提供的全屏壳；定位、层级、淡出都由 Host 负责 */
.birthday-splash {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background: var(--paper);
}
.splash-wash {
  position: absolute;
  inset: -12%;
  background:
    radial-gradient(44% 36% at 70% 24%, #f1e3c8 0%, #f1e3c800 70%),
    radial-gradient(40% 34% at 20% 78%, #e6ecdf 0%, #e6ecdf00 72%);
  animation: splash-breathe 7s ease-in-out infinite;
}
.splash-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.splash-stars span {
  position: absolute;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: #d9bb85;
  opacity: 0;
  animation: splash-twinkle 3.4s var(--delay) ease-in-out infinite;
}
.splash-inner {
  --shift: -70px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 480px;
  text-align: center;
  transform: translateY(var(--shift));
  transition:
    opacity 0.6s ease,
    transform 0.72s cubic-bezier(0.4, 0, 0.2, 1);
}
.birthday-splash.leaving .splash-inner {
  opacity: 0;
  transform: translateY(calc(var(--shift) - 16px)) scale(0.99);
}
.splash-scene {
  width: clamp(250px, 34vw, 400px);
  max-width: 78vw;
  height: auto;
  margin-bottom: -4px;
}
.splash-trail {
  opacity: 0.95;
}
.splash-reveal-path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: splash-draw 1.5s 0.3s cubic-bezier(0.45, 0, 0.2, 1) forwards;
}
.splash-plane {
  opacity: 1;
}
.birthday-splash:not(.reduced) .splash-plane {
  opacity: 0;
  /* 略晚于起飞时间出现，免得飞机先在画布左上角闪一下 */
  animation: splash-appear 0.16s 0.4s both;
}
.splash-eyebrow {
  display: block;
  font-size: 11px;
  letter-spacing: 0.26em;
  color: var(--honey);
  animation: splash-rise 0.8s 1.42s both;
}
.splash-title {
  margin-top: 14px;
  font-family: Georgia, "Songti SC", "SimSun", serif;
  font-size: clamp(29px, 6.4vw, 44px);
  font-weight: 500;
  letter-spacing: 0.05em;
  line-height: 1.4;
  color: var(--ink);
}
.splash-title span {
  display: inline-block;
  opacity: 0;
  animation: splash-char 0.72s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(1.55s + var(--i) * 0.07s);
}
.splash-sub {
  margin-top: 12px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--muted);
  animation: splash-rise 0.85s 1.96s both;
}
.splash-underline {
  display: block;
  width: 76px;
  height: 2px;
  margin-top: 18px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--honey), transparent);
  transform: scaleX(0);
  animation: splash-underline 0.9s 2.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.splash-sign {
  display: block;
  margin-top: 12px;
  font-size: 11.5px;
  letter-spacing: 0.14em;
  color: #8d9789;
  animation: splash-rise 0.85s 2.6s both;
}
.splash-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.splash-confetti span {
  position: absolute;
  top: -10%;
  width: 5px;
  height: 8px;
  border-radius: 1.5px;
  opacity: 0;
  animation: splash-fall 2.9s var(--delay, 2.4s)
    cubic-bezier(0.35, 0.55, 0.45, 1) forwards;
}
.splash-confetti .honey {
  background: #d9bb85;
}
.splash-confetti .leaf {
  background: #94ab99;
}
.splash-confetti .paper {
  background: #e6ddc9;
}
.splash-close {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid #ebe9dd;
  border-radius: 50%;
  background: #fbf9f38c;
  color: #98a294;
  box-shadow: 0 2px 10px #2c403b0a;
  opacity: 0;
  animation: splash-close-in 3s 3.5s linear forwards;
}
.birthday-splash.reduced .splash-wash,
.birthday-splash.reduced .splash-stars span,
.birthday-splash.reduced .splash-confetti span {
  animation: none;
  opacity: 0;
}
.birthday-splash.reduced .splash-close {
  animation-delay: 1.2s;
}
@keyframes splash-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.62;
  }
}
@keyframes splash-rise {
  from {
    opacity: 0;
    transform: translateY(9px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes splash-char {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes splash-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes splash-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes splash-underline {
  to {
    transform: scaleX(1);
  }
}
@keyframes splash-twinkle {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.6;
    transform: scale(1);
  }
}
@keyframes splash-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.92;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}
@keyframes splash-fall {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  12% {
    opacity: 0.75;
  }
  100% {
    opacity: 0.55;
    transform: translate3d(var(--drift, 0px), 118vh, 0) rotate(520deg);
  }
}
@keyframes splash-close-in {
  from {
    opacity: 0;
    transform: scale(0.88) translateY(-8px);
  }
  50% {
    opacity: 0.15;
    transform: scale(0.94) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (hover: hover) {
  .splash-close:hover {
    background: #fffdf8cc;
    border-color: #e2e0d2;
    color: #5d6a5c;
  }
}
@media (max-width: 540px) {
  .splash-inner {
    max-width: 340px;
  }
  .splash-scene {
    width: min(300px, 84vw);
  }
  .splash-sub {
    font-size: 13.5px;
  }
  .splash-close {
    top: max(12px, env(safe-area-inset-top));
    right: max(12px, env(safe-area-inset-right));
    width: 44px;
    height: 44px;
  }
}
</style>
