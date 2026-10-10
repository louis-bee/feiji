<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Plane, ArrowRight, Eye, EyeOff } from "lucide-vue-next";
import Avatar from "../components/Avatar.vue";
import { enter, state } from "../store";
import { ENTRY_PASSWORD } from "../config";
import type { Actor, Profile } from "../types";
import { api } from "../api";
import JourneyArt from "../components/JourneyArt.vue";

onMounted(() => {
  void api<Profile[]>("/api/profiles")
    .then((profiles) => {
      state.profiles = profiles;
    })
    .catch(() => {});
});
const router = useRouter();
const route = useRoute();
const selected = ref<Actor>("her");
const password = ref("");
const error = ref("");
const reveal = ref(false);

function submit() {
  if (password.value !== ENTRY_PASSWORD) {
    error.value = "口令不太对，再试一次吧。";
    return;
  }
  enter(selected.value);
  const redirect = String(route.query.redirect || "/");
  void router.replace(
    redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      !redirect.startsWith("/login")
      ? redirect
      : "/",
  );
}
</script>

<template>
  <main class="login-page">
    <div class="login-story">
      <RouterLink to="/" class="brand">
        <span class="brand-symbol"><Plane :size="24" /></span>
        <span><strong>双人飞行日志</strong><small>OUR FLIGHT LOG</small></span>
      </RouterLink>
      <div class="login-art">
        <JourneyArt />
        <div class="art-label">两个人，一本慢慢写完的手账。</div>
      </div>
      <div class="login-story-copy">
        <span class="eyebrow">A LITTLE FURTHER, TOGERTHER</span>
        <h1>世界很大，<br />和你慢慢走。</h1>
        <p>记录平凡的日子里，那些舍不得忘的瞬间。</p>
      </div>
    </div>
    <section class="login-form-panel">
      <span class="eyebrow">WELCOME BACK / 欢迎回来</span>
      <h2>今天，由谁来翻开？</h2>
      <p class="muted">选一个熟悉的名字，回到我们的小世界。</p>
      <form @submit.prevent="submit">
        <div class="identity-options">
          <button
            v-for="p in state.profiles"
            :key="p.id"
            type="button"
            :class="['identity-option', { selected: selected === p.id }]"
            :aria-pressed="selected === p.id"
            @click="selected = p.id"
          >
            <Avatar :actor="p.id" large /><strong>{{ p.nickname }}</strong
            ><small>{{
              p.id === "her" ? "风里有一架小飞机" : "带着蜜蜂黄的企鹅"
            }}</small>
          </button>
        </div>
        <label
          >我们的口令
          <div class="password-input">
            <input
              v-model="password"
              aria-label="我们的口令"
              :type="reveal ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="输入共同的口令"
              required
              @input="error = ''"
            />
            <button
              type="button"
              class="icon-button"
              @click="reveal = !reveal"
              :aria-label="reveal ? '隐藏口令' : '显示口令'"
            >
              <EyeOff v-if="reveal" :size="18" /><Eye v-else :size="18" />
            </button>
          </div>
        </label>
        <p v-if="error" class="error-text" role="alert">{{ error }}</p>
        <button class="button primary login-submit">
          翻开我们的日志<ArrowRight :size="18" />
        </button>
      </form>
      <p class="login-boundary">前端简单口令，不提供真正的访问保护</p>
      <small class="login-since">OUR STORY, STILL UNFOLDING.</small>
    </section>
  </main>
</template>
