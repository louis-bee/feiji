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
import { editorOpen, writeEntry, viewerId } from "./ui";
import Avatar from "./components/Avatar.vue";
import EntryEditor from "./components/EntryEditor.vue";
import MediaViewer from "./components/MediaViewer.vue";

const route = useRoute();
const router = useRouter();
const links = [
  { to: "/", text: "首页", icon: House },
  { to: "/calendar", text: "日历", icon: CalendarDays },
  { to: "/album", text: "相册", icon: Images },
  { to: "/anniversary", text: "纪念日", icon: Heart },
];

function reload() {
  void refresh().catch(() => {});
}

function logout() {
  if (!confirm("暂时合上日志？")) return;
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
  <RouterView v-if="route.path === '/login'" />
  <div v-else class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/" class="brand">
        <span><strong>双人飞行日志</strong><small>OUR FLIGHT LOG</small></span>
      </RouterLink>
      <div class="sidebar-divider" />
      <span class="nav-captain">属于我们的 / JOURNAL</span>
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
                timeZone: "state.settings.timezone",
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
          <h2>{{ loadError ? "日志暂时未能打开" : "正在翻开我们的日志…" }}</h2>
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
        <span>慢慢走，好好记。<ArrowRight :size="12" /></span>
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
  <EntryEditor v-if="editorOpen && actor" />
  <MediaViewer v-if="viewerId" :id="viewerId" />
  <div v-if="notice" class="toast" role="status">{{ notice }}</div>
</template>
