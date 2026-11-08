<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Plane, ArrowRight, Eye, EyeOff } from "lucide-vue-next";
import Avatar from "../components/Avatar.vue";
import { enter, state } from "../store";
import { entryPassword, loadConfig } from "../config";
import type { Actor, Profile } from "../../shared/types";
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

async function submit() {
  await loadConfig();
  if (!password.value) {
    error.value = "请输入我们的口令。";
    return;
  }
  if (password.value !== entryPassword.value) {
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
      <form novalidate @submit.prevent="submit">
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
              p.id === "her" ? "风里有只小飞机" : "追着航迹的企鹅"
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
      <p class="login-boundary"></p>
      <small class="login-since">OUR STORY, STILL UNFOLDING.</small>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: #f9f7f0;
}
.login-story {
  background: #e9eddf;
  position: relative;
  padding: 42px 55px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}
.brand strong {
  display: block;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0.03em;
}
.brand small {
  display: block;
  margin-top: 5px;
  font-size: 8px;
  letter-spacing: 0.18em;
  color: #7f8878;
}
.brand-symbol {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: #3c5c4d;
  color: #f5efd9;
  border-radius: 13px;
  transform: rotate(-3deg);
}
.login-art {
  margin: 55px 0 35px;
  background: #fffdf2;
  padding: 13px 13px 0;
  box-shadow: 0 10px 30px #304b3620;
  transform: rotate(-2deg);
  max-width: 560px;
  border: 1px solid #e2e3cf;
}
.login-art > .journey-art {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 1.6;
  object-fit: cover;
}
.art-label {
  padding: 18px 9px;
  font-size: 12px;
  color: #7d8c6b;
  letter-spacing: 0.07em;
}
.login-story-copy {
  margin-top: auto;
  padding: 7px 6px 15px;
}
.login-story-copy h1 {
  font-size: 42px;
  line-height: 1.5;
  margin: 14px 0 12px;
  letter-spacing: 0.05em;
}
.login-story-copy p {
  font-size: 13px;
  color: #8d967f;
  line-height: 1.8;
}
.login-form-panel {
  width: 100%;
  max-width: 490px;
  margin: auto;
  padding: 50px 30px;
}
.login-form-panel h2 {
  font-size: 27px;
  margin: 14px 0 11px;
}
.login-form-panel > .muted {
  font-size: 12px;
  color: #65715f;
  margin-bottom: 28px;
}
.identity-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 29px;
}
.identity-option {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 21px 12px;
  border: 1px solid #e0e4d1;
  border-radius: 12px;
  background: #fffdf6;
  gap: 11px;
}
.identity-option.selected {
  border-color: #8da17b;
  background: #eaf0e0;
  box-shadow: 0 0 0 1px #8da17b;
}
.identity-option > strong {
  font-size: 14px;
  font-weight: 500;
}
.identity-option > small {
  font-size: 9px;
  color: #65715f;
}
.password-input {
  display: flex;
  align-items: center;
  position: relative;
  margin-top: 8px;
}
.password-input input {
  padding-right: 46px;
}
.password-input .icon-button {
  position: absolute;
  right: 5px;
}
.login-submit {
  width: 100%;
  margin-top: 24px;
  justify-content: space-between;
  padding-left: 20px;
  padding-right: 20px;
}
.login-boundary {
  font-size: 10px;
  color: #65715f;
  line-height: 1.9;
  margin-top: 22px;
}
.login-since {
  display: block;
  font-size: 8px;
  letter-spacing: 0.17em;
  color: #a5ae97;
  margin-top: 45px;
}
@media (max-width: 1200px) {
  .login-story {
    padding: 32px;
  }
  .login-story-copy h1 {
    font-size: 35px;
  }
}
@media (max-width: 1000px) {
  .login-story {
    padding: 25px;
  }
  .login-form-panel {
    padding: 40px 25px;
  }
  .login-form-panel h2 {
    font-size: 23px;
  }
  .identity-option {
    padding: 17px 8px;
  }
  .identity-option > small {
    font-size: 8px;
  }
  .login-story-copy h1 {
    font-size: 32px;
  }
}
@media (max-width: 760px) {
  .login-page {
    grid-template-columns: 1fr;
  }
  .login-story {
    padding: 23px 24px 0;
    background: #e9eddf;
  }
  .login-story .brand {
    gap: 10px;
  }
  .login-story .brand strong {
    font-size: 15px;
  }
  .login-story .brand small {
    font-size: 7px;
  }
  .login-art {
    display: none;
  }
  .login-story-copy {
    padding: 25px 0 25px;
  }
  .login-story-copy .eyebrow {
    font-size: 8px;
  }
  .login-story-copy h1 {
    font-size: 31px;
    margin: 10px 0;
  }
  .login-story-copy h1 br {
    display: none;
  }
  .login-story-copy p {
    font-size: 11px;
  }
  .login-form-panel {
    max-width: 500px;
    padding: 27px 25px 35px;
  }
  .login-form-panel > .eyebrow {
    font-size: 8px;
  }
  .login-form-panel h2 {
    font-size: 24px;
    margin: 8px 0;
  }
  .login-form-panel > .muted {
    margin-bottom: 21px;
  }
  .identity-options {
    margin-bottom: 23px;
  }
  .identity-option {
    padding: 17px 12px;
  }
  .identity-option > small {
    font-size: 9px;
  }
  .login-since {
    margin-top: 25px;
  }
  .login-boundary {
    font-size: 9px;
  }
}
@media (max-width: 540px) {
  .login-story-copy h1 {
    font-size: 27px;
  }
  .identity-option .avatar.large {
    width: 58px;
    height: 58px;
  }
}
</style>
