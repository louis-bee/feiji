<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Plane,
  House,
  CalendarDays,
  Images,
  Heart,
  Settings,
  Plus,
  LogOut,
  RefreshCw,
  ArrowRight,
} from "lucide-vue-next";
import {
  actor,
  state,
  names,
  currentProfile,
  loaded,
  loading,
  loadError,
  refresh,
  leave,
  clock,
  notice,
} from "./store";
import { confirmDialog, editorOpen, writeEntry, viewerId } from "./ui";
import Avatar from "./components/Avatar.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import EntryEditor from "./components/EntryEditor.vue";
import MediaViewer from "./components/MediaViewer.vue";
// 暂时没有开屏在档期：注释掉就不会把开屏代码打进包。
// 要恢复时，放开这里和模板里的 <SplashHost /> 即可。
// import SplashHost from "./components/SplashHost.vue";

const route = useRoute();
const router = useRouter();
const links = [
  { to: "/", text: "首页", icon: House },
  { to: "/calendar", text: "日历", icon: CalendarDays },
  { to: "/album", text: "相册", icon: Images },
  { to: "/anniversaries", text: "纪念日", icon: Heart },
];

function reload() {
  void refresh().catch(() => {});
}

async function logout() {
  if (
    !(await confirmDialog("暂时合上日志？", {
      danger: true,
      confirmText: "合上日志",
    }))
  )
    return;
  leave();
  void router.replace("/login");
}

watch(
  actor,
  (value) => {
    if (value) reload();
  },
  { immediate: true },
);

function resume() {
  clock.value = new Date();
  if (
    actor.value &&
    document.visibilityState === "visible" &&
    !editorOpen.value
  ) {
    reload();
  }
}

let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  timer = setInterval(() => {
    clock.value = new Date();
  }, 30_000);
  document.addEventListener("visibilitychange", resume);
});

onUnmounted(() => {
  clearInterval(timer);
  document.removeEventListener("visibilitychange", resume);
});
</script>

<template>
  <!-- <SplashHost /> -->
  <Transition name="shell-swap" mode="out-in">
    <RouterView v-if="route.path === '/login'" key="login" />
    <div v-else class="app-shell" key="shell">
      <aside class="sidebar">
        <RouterLink to="/" class="brand">
          <span
            ><strong>双人飞行日志</strong><small>OUR FLIGHT LOG</small></span
          >
        </RouterLink>
        <div class="sidebar-divider" />
        <span class="nav-caption">属于我们的 / JOURNAL</span>
        <nav aria-label="主导航">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :class="['nav-link', { active: route.path === link.to }]"
          >
            <component :is="link.icon" :size="19" />
            <span>{{ link.text }}</span>
            <span class="nav-dot" />
          </RouterLink>
        </nav>
        <button
          type="button"
          class="button primary sidebar-write"
          @click="writeEntry()"
        >
          <Plus :size="17" />记下今天
        </button>
        <div class="sidebar-bottom">
          <div class="mini-note">
            <span class="tiny-flight">········ <Plane :size="15" /></span>
            <p>不比每一天都特别，<br />和你一起就值得记录。</p>
            <small
              >SINCE {{ state.settings.startDate.replaceAll("-", ".") }}</small
            >
          </div>
          <RouterLink to="/settings" class="sidebar-profile">
            <Avatar :actor="actor || 'her'" />
            <span
              ><strong>{{ currentProfile?.nickname }}</strong
              ><small>正在写我们的故事</small></span
            >
            <Settings :size="17" />
          </RouterLink>
        </div>
      </aside>
      <div class="main-shell">
        <header class="topbar">
          <div class="breadcrumb">
            <span class="desktop-only">我们的手账</span>
            <span class="desktop-only">/</span>
            <strong>{{ route.meta.title }}</strong>
          </div>
          <div class="top-actions">
            <span class="top-date">
              {{
                new Intl.DateTimeFormat("zh-CN", {
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                  timeZone: state.settings.timezone,
                }).format(clock)
              }}
            </span>
            <button
              type="button"
              class="button icon-button"
              aria-label="刷新记录"
              @click="reload()"
              :disabled="loading"
            >
              <RefreshCw :size="16" :class="{ spinning: loading }" />
            </button>
            <RouterLink
              to="/settings"
              class="icon-button mobile-settings"
              aria-label="设置"
            >
              <Settings :size="18" />
            </RouterLink>
            <button
              type="button"
              class="icon-button"
              aria-label="退出日志"
              @click="logout()"
            >
              <LogOut :size="17" />
            </button>
          </div>
        </header>
        <main class="main-content">
          <div v-if="loadError" role="alert" class="connection-error">
            <span>{{ loadError }}</span>
            <button type="button" class="text-button" @click="reload()">
              重新连接
            </button>
          </div>
          <div v-if="!loaded" class="loading-state">
            <Plane :size="32" />
            <h2>
              {{ loadError ? "日志暂时未能打开" : "正在翻开我们的日志…" }}
            </h2>
            <p>记录会保存到服务器上，不会只留在这台设备。</p>
          </div>
          <RouterView v-else />
        </main>
        <footer class="site-footer">
          <span
            >{{ names }} · 始于{{
              state.settings.startDate.replaceAll("-", ".")
            }}</span
          >
          <span>慢慢走，好好记<ArrowRight :size="12" /></span>
        </footer>
      </div>
      <nav class="mobile-nav" aria-label="移动端导航">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :class="{ active: route.path === link.to }"
        >
          <component :is="link.icon" :size="21" />
          <span>{{ link.text }}</span>
        </RouterLink>
      </nav>
    </div>
  </Transition>
  <EntryEditor v-if="editorOpen && actor" />
  <MediaViewer v-if="viewerId" :id="viewerId" />
  <ConfirmDialog />
  <div v-if="notice" class="toast" role="status">{{ notice }}</div>
</template>

<style scoped>
/* 登录页 ⇄ 主应用的切换过渡：像合上封面后再翻开手账 */
.shell-swap-enter-active {
  transition:
    opacity 0.42s ease,
    transform 0.62s cubic-bezier(0.22, 0.72, 0.24, 1);
}
.shell-swap-leave-active {
  transition:
    opacity 0.26s ease,
    transform 0.26s ease;
}
.shell-swap-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.994);
}
.shell-swap-leave-to {
  opacity: 0;
  transform: scale(0.99);
}
.app-shell {
  display: flex;
  min-height: 100dvh;
}
.sidebar {
  width: 238px;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  padding: 34px 24px 21px;
  background: #eeeee3;
  border-right: 1px solid #e1e3d6;
  z-index: 20;
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;

  strong {
    display: block;
    font-size: 16px;
    font-weight: 650;
    letter-spacing: 0.03em;
  }

  small {
    display: block;
    margin-top: 5px;
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #7f8878;
  }
}
.sidebar-divider {
  height: 1px;
  background: #daddce;
  margin: 29px 0 25px;
}
.nav-caption {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: #89907e;
  margin: 0 10px 13px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 15px;
  font-size: 14px;
  border-radius: 9px;
  margin: 5px 0;
  color: #7b8476;

  &.active {
    background: #dfe5d4;
    color: #375647;
    font-weight: 600;

    .nav-dot {
      background: #78966d;
    }
  }
}
@media (hover: hover) {
  .nav-link:hover {
    background: #e8eadb;
  }
}
.nav-dot {
  margin-left: auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
}
.sidebar-write {
  margin: 23px 3px 0;
}
.sidebar-bottom {
  margin-top: auto;
  padding-top: 40px;
}
.mini-note {
  margin: 0 10px 28px;

  p {
    font-size: 12px;
    line-height: 2;
    color: #879078;
  }

  small {
    display: block;
    color: #9c9f8e;
    font-family: monospace;
    font-size: 9px;
    letter-spacing: 0.06em;
    margin-top: 13px;
  }
}
.tiny-flight {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #aaa886;
  letter-spacing: 4px;
  margin-bottom: 16px;
}
.sidebar-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 19px;
  border-top: 1px solid #d9decc;

  > span:nth-child(2) {
    flex: 1;
  }

  strong {
    display: block;
    font-size: 12px;
  }

  small {
    font-size: 9px;
    display: block;
    color: #8b9181;
    margin-top: 5px;
  }
}
.main-shell {
  margin-left: 238px;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: 77px;
  padding: 0 45px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e7e6dd;
  background: #faf8f3b5;
}
.breadcrumb {
  display: flex;
  gap: 15px;
  align-items: center;
  font-size: 12px;
  color: #8e9287;

  strong {
    font-weight: 500;
    color: #546454;
  }
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.top-date {
  font-size: 11px;
  color: #8a9182;
  margin-right: 7px;
}
.main-content {
  padding: 34px 45px 35px;
  max-width: 1450px;
  width: 100%;
  margin: 0 auto;
  flex: 1;
}
.site-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 19px 45px;
  border-top: 1px solid #e7e5da;
  color: #939a8a;
  font-size: 10px;
  letter-spacing: 0.04em;

  > span:last-child {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}
.mobile-nav,
.mobile-settings {
  display: none;
}
.connection-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 12px 17px;
  border-radius: 10px;
  margin-bottom: 20px;
  background: #fae8e0;
  color: #943d36;
  font-size: 13px;
}
.loading-state {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 17px;
  text-align: center;

  p {
    font-size: 13px;
    color: var(--muted);
  }
}
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 13px 23px;
  max-width: min(90vw, 550px);
  background: #304b40;
  color: #fffdf6;
  border: 1px solid #56705c;
  border-radius: 12px;
  box-shadow: 0 9px 30px #213c3325;
  z-index: 1000;
  font-size: 13px;
  line-height: 1.7;
  pointer-events: none;
}

@media (min-width: 1500px) {
  .main-content {
    padding-top: 43px;
  }
}
@media (max-width: 1200px) {
  .sidebar {
    width: 205px;
    padding-left: 17px;
    padding-right: 17px;
  }
  .main-shell {
    margin-left: 205px;
  }
  .main-content {
    padding: 28px;
  }
  .topbar {
    padding: 0 28px;
  }
  .site-footer {
    padding: 18px 28px;
  }
  .brand strong {
    font-size: 14px;
  }
}
@media (max-width: 1000px) {
  .sidebar {
    width: 185px;
    padding: 29px 13px 20px;
  }
  .main-shell {
    margin-left: 185px;
  }
  .brand {
    gap: 8px;
  }
  .brand strong {
    font-size: 13px;
  }
  .brand small {
    font-size: 6px;
  }
  .main-content {
    padding: 26px 23px;
  }
  .topbar {
    padding: 0 23px;
    height: 67px;
  }
}
@media (max-width: 760px) {
  .sidebar {
    display: none;
  }
  .main-shell {
    margin-left: 0;
  }
  .main-content {
    padding: 24px 19px 25px;
  }
  .topbar {
    height: 62px;
    padding: 0 19px;
    background: #f6f3ec;
  }
  .breadcrumb {
    font-size: 13px;
  }
  .desktop-only {
    display: none;
  }
  .top-actions {
    gap: 4px;
  }
  .top-date {
    font-size: 10px;
    margin-right: 2px;
  }
  .top-actions .icon-button {
    width: 33px;
    height: 36px;
  }
  .mobile-settings {
    display: inline-flex;
  }
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: #fdfcf5f5;
    border-top: 1px solid #e0e4d4;
    padding: 8px 10px max(9px, env(safe-area-inset-bottom));
    z-index: 30;
    backdrop-filter: blur(15px);
  }
  .mobile-nav > a {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 4px;
    color: #96a18a;
    font-size: 10px;
    min-width: 60px;
    min-height: 46px;
    border-radius: 9px;
  }
  .mobile-nav > a.active {
    color: #3d634d;
  }
  .mobile-nav > a.active svg {
    fill: #dae3cf;
    stroke-width: 2;
  }
  .app-shell {
    padding-bottom: 79px;
  }
  .site-footer {
    padding: 18px 19px;
    font-size: 8px;
  }
  .site-footer > span:last-child {
    gap: 4px;
  }
  .toast {
    bottom: 90px;
    font-size: 12px;
    width: max-content;
    max-width: 90vw;
  }
  .topbar .icon-button {
    min-height: 38px;
  }
  .top-actions .icon-button {
    min-height: 44px;
  }
}
@media (max-width: 540px) {
  .site-footer {
    flex-direction: column;
    align-items: center;
    gap: 9px;
  }
}
@media (hover: none) {
  .nav-link:active {
    opacity: 0.7;
  }
}
</style>
