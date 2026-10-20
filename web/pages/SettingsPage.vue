<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { Check } from "lucide-vue-next";
import { state, notify } from "../store";
import { api } from "../api";
import { confirmDialog } from "../ui";
import Avatar from "../components/Avatar.vue";
import type { Settings, Profile } from "../../shared/types";

const settings = ref({ ...state.settings });
const profiles = ref(state.profiles.map((p) => ({ ...p })));
const initial = ref(
  JSON.stringify({ settings: settings.value, profiles: profiles.value }),
);
const dirty = computed(
  () =>
    initial.value !==
    JSON.stringify({ settings: settings.value, profiles: profiles.value }),
);
const saving = ref(false);
const error = ref("");
async function save() {
  for (const p of profiles.value) {
    if (!p.nickname.trim()) {
      error.value = "请填写昵称。";
      return;
    }
    if (!p.birthday) {
      error.value = "请选择公历生日。";
      return;
    }
  }
  if (!settings.value.startDate) {
    error.value = "请选择恋爱起始日。";
    return;
  }
  if (!settings.value.timezone.trim()) {
    error.value = "请填写一起使用的时区。";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const result = await api<Settings>("/api/settings", "PUT", settings.value);
    state.settings = result;
    settings.value = { ...result };
    for (const p of profiles.value) {
      const result = await api<Profile>(`/api/profiles/${p.id}`, "PUT", {
        nickname: p.nickname,
        birthday: p.birthday,
      });
      const index = state.profiles.findIndex((value) => value.id === result.id);
      state.profiles[index] = result;
    }
    profiles.value = state.profiles.map((p) => ({ ...p }));
    initial.value = JSON.stringify({
      settings: settings.value,
      profiles: profiles.value,
    });
    notify("设置已经保存好了");
  } catch (e) {
    error.value = `${(e as Error).message} 已成功保存的项目会保留，其余输入也还在。`;
  } finally {
    saving.value = false;
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}
onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;
  return confirmDialog("还有未保存的设置，确定离开吗？", {
    danger: true,
    confirmText: "离开",
  });
});
onMounted(() => {
  window.addEventListener("beforeunload", beforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>

<template>
  <section class="page-intro">
    <div>
      <span class="eyebrow">MIKE IT OURS</span>
      <h1>我们的设置</h1>
      <p>名字、日期，还有打开日志时看到的第一张照片。</p>
    </div>
  </section>
  <form class="settings-layout" novalidate @submit.prevent="save">
    <section class="settings-card">
      <h2>故事的主角</h2>
      <div v-for="p in profiles" :key="p.id" class="profile-fields">
        <Avatar :actor="p.id" large />
        <div>
          <label>
            {{ p.id === "her" ? "她的昵称" : "我的昵称" }}
            <input
              v-model="p.nickname"
              :aria-label="p.id === 'her' ? '她的昵称' : '我的昵称'"
              required
              maxlength="40"
            />
          </label>
          <label>
            公历生日
            <input
              v-model="p.birthday"
              :aria-label="`${p.id}生日`"
              type="date"
              min="1900-01-01"
              max="2099-12-31"
              required
            />
          </label>
        </div>
      </div>
    </section>
    <section class="settings-card">
      <h2>从这一天开始</h2>
      <div class="form-stack">
        <label>
          恋爱起始日
          <input
            v-model="settings.startDate"
            aria-label="恋爱起始日"
            type="date"
            min="1900-01-01"
            max="2099-12-31"
            required
          />
        </label>
        <p class="field-hint">开始当天算第 1 天，周年按公历日期算。</p>
        <label>
          一起使用的时区<input
            v-model="settings.timezone"
            aria-label="业务时区"
            required
            list="timezones"
            placeholder="Asia/Shanghai"
          />
          <datalist id="timezones">
            <option value="Asia/Shanghai" />
            <option value="Asia/Tokyo" />
            <option value="Europe/London" />
            <option value="America/New_York" />
            <option value="UTC" />
          </datalist>
        </label>
        <label
          >首页的一句话<textarea
            v-model="settings.intro"
            aria-label="首页寄语"
            maxlength="300"
            rows="2"
          />
        </label>
        <label>
          封面照片
          <select v-model="settings.coverMediaId" aria-label="封面照片">
            <option :value="null">用一幅山野插画，等待我们的照片</option>
            <option
              v-for="m in state.media.filter((m) => m.kind === 'image')"
              :key="m.id"
              :value="m.id"
            >
              {{ m.caption || m.name }}
            </option>
          </select>
        </label>
        <p class="field-hint">现在相册上传图片，再把喜欢的一张选为封面。</p>
      </div>
    </section>
    <div class="settings-bottom">
      <div class="boundary-note">
        <!-- <Info :size="18" />
        <p>
          目前使用前端口令入口，不能保护 API
          和媒体链接。口令在<code>web/config.ts</code>中修改。本站不自动备份，不提供原片下载功能
        </p> -->
      </div>
      <p v-if="error" role="alert" class="error-text">{{ error }}</p>
      <button class="button primary" :disabled="!dirty || saving">
        <Check :size="17" />
        {{ saving ? "正在保存…" : "保存设置" }}
      </button>
    </div>
  </form>
</template>
