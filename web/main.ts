import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import { actor } from "./store";
import { loadConfig } from "./config";
import "./style.css";

void loadConfig();

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      component: () => import("./pages/LoginPage.vue"),
      meta: { title: "进入日志" },
    },
    {
      path: "/",
      component: () => import("./pages/HomePage.vue"),
      meta: { title: "我们的这一页" },
    },
    {
      path: "/calendar",
      component: () => import("./pages/CalendarPage.vue"),
      meta: { title: "恋爱日历" },
    },
    {
      path: "/album",
      component: () => import("./pages/AlbumPage.vue"),
      meta: { title: "沿途收藏" },
    },
    {
      path: "/anniversaries",
      component: () => import("./pages/EventsPage.vue"),
      meta: { title: "纪念日" },
    },
    {
      path: "/settings",
      component: () => import("./pages/SettingsPage.vue"),
      meta: { title: "我们的设置" },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
  scrollBehavior: (to, from) => {
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  if (!actor.value && to.path !== "/login") {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (actor.value && to.path === "/login") return "/";
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title || "双人飞行日志")} - 双人飞行日志`;
});

createApp(App).use(router).mount("#app");
