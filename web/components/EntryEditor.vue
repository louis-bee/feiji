<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { Check, ImagePlus, PenLine } from "lucide-vue-next";
import Model from "../components/Model.vue";
import UploadBox from "../components/UploadBox.vue";
import MediaThumb from "../components/MediaThumb.vue";
import { state, actor, notify, today } from "../store";
import { api } from "../api";
import type { Entry, Media } from "../../shared/types";
import { confirmDialog, editorOpen, editorDate, editorEntry } from "../ui";

const original = editorEntry.value;
const date = ref(editorDate.value);
const body = ref(original?.body || "");
const mediaIds = ref<string[]>([...(original?.mediaIds || [])]);
const selectedMedia = computed(() =>
  mediaIds.value.flatMap((id) => {
    const media = state.media.find((item) => item.id === id);
    return media ? [media] : [];
  }),
);
const saving = ref(false);
const uploading = ref(false);
const showLibrary = ref(false);
const error = ref("");
const dirty = computed(
  () =>
    date.value !== editorDate.value ||
    body.value !== (original?.body || "") ||
    mediaIds.value.join() !== (original?.mediaIds || []).join(),
);
async function close() {
  if (saving.value || uploading.value) return;
  if (
    dirty.value &&
    !(await confirmDialog(
      "还有未保存的记录，确定离开吗？已上传的媒体会保留在相册里。",
      { danger: true, confirmText: "离开" },
    ))
  )
    return;
  editorOpen.value = false;
}
function toggle(id: string) {
  mediaIds.value = mediaIds.value.includes(id)
    ? mediaIds.value.filter((value) => value !== id)
    : [...mediaIds.value, id];
}
// 本次编辑中上传的媒体
const uploadedIds: string[] = [];
function onUploaded(media: Media) {
  if (!uploadedIds.includes(media.id)) uploadedIds.push(media.id);
  if (!mediaIds.value.includes(media.id)) mediaIds.value.push(media.id);
}
// 把这些媒体的日期对齐到记录日期
async function syncMediaDates(ids: Iterable<string>, target: string) {
  for (const id of new Set(ids)) {
    const media = state.media.find((item) => item.id === id);
    if (!media || media.date === target) continue;
    try {
      const updated = await api<Media>(`/api/media/${id}`, "PATCH", {
        albumId: media.albumId,
        caption: media.caption,
        date: target,
        featured: media.featured,
        version: media.version,
      });
      state.media = state.media.map((item) =>
        item.id === updated.id ? updated : item,
      );
    } catch {
      // 日期同步失败不影响记录本身，媒体仍保留在相册中
    }
  }
}
async function save() {
  if (!date.value) {
    error.value = "请选择记录日期。";
    return;
  }
  if (!body.value.trim() && !mediaIds.value.length) {
    error.value = "写一句话，或添加一张图片、一段视频。";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const result = await api<Entry>(
      original ? `/api/entries/${original.id}` : "/api/entries",
      original ? "PATCH" : "POST",
      {
        date: date.value,
        body: body.value.trim(),
        authorId: original?.authorId || actor.value,
        mediaIds: mediaIds.value,
        ...(original ? { version: original.version } : {}),
      },
    );
    state.entries = [
      result,
      ...state.entries.filter((e) => e.id !== result.id),
    ].sort((a, b) => b.date.localeCompare(a.date));
    // 日期改动过时，这条记录下的所有照片/视频一起改到新日期
    const movedDate = !!original && original.date !== date.value;
    await syncMediaDates(movedDate ? mediaIds.value : uploadedIds, date.value);
    notify("这一刻，已经好好记下了");
    editorOpen.value = false;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value || uploading.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}
onMounted(() => {
  window.addEventListener("beforeunload", beforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>

<template>
  <Model
    :title="original ? '再填几笔' : '记下这一天'"
    :busy="saving || uploading"
    wide
    @close="close"
  >
    <form class="form-stack" novalidate @submit.prevent="save">
      <div class="form-row">
        <label
          >发生在这一天<input
            v-model="date"
            aria-label="记录日期"
            type="date"
            min="1900-01-01"
            :max="today"
            required
        /></label>
        <div class="author-note">
          <PenLine :size="16" /><span
            >由{{
              state.profiles.find((p) => p.id === (original?.authorId || actor))
                ?.nickname
            }}写下</span
          >
        </div>
      </div>
      <label
        >想记住的事<textarea
          v-model="body"
          aria-label="记录内容"
          rows="5"
          maxlength="20000"
          placeholder="一句话也好，一段小事也好，今天想和你一起记住什么？"
        />
      </label>
      <div v-if="mediaIds.length" class="selected-media">
        <button
          v-for="media in selectedMedia"
          :key="media.id"
          type="button"
          aria-label="移除这项附件"
          @click="toggle(media.id)"
        >
          <MediaThumb :media="media" /><span>移除</span>
        </button>
      </div>
      <UploadBox
        :date="date"
        @uploaded="onUploaded"
        @busy="uploading = $event"
      />
      <button
        type="button"
        class="text-button"
        @click="showLibrary = !showLibrary"
      >
        <ImagePlus :size="16" />{{
          showLibrary ? "收起相册" : "也可以从已有相册选择"
        }}
      </button>
      <div v-if="showLibrary" class="library-grid">
        <button
          v-for="m in state.media"
          :key="m.id"
          type="button"
          :class="{ chosen: mediaIds.includes(m.id) }"
          :aria-label="`选择${m.name}`"
          :aria-pressed="mediaIds.includes(m.id)"
          @click="toggle(m.id)"
        >
          <MediaThumb :media="m" /><Check
            v-if="mediaIds.includes(m.id)"
            :size="18"
          />
        </button>
        <p v-if="!state.media.length" class="muted">
          相册还是空的，先上传一个瞬间吧。
        </p>
      </div>
      <p v-if="error" role="alert" class="error-text">
        {{ error
        }}<span v-if="error.includes('更新') || error.includes('冲突')"
          >请保留文字，关闭后刷新再编辑</span
        >
      </p>
      <footer class="form-footer">
        <button
          type="button"
          class="button secondary"
          :disabled="saving || uploading"
          @click="close"
        >
          暂时不写
        </button>
        <button class="button primary" :disabled="saving || uploading">
          {{ saving ? "正在保存…" : uploading ? "等待上传完成…" : "保存这一刻"
          }}<Check :size="16" />
        </button>
      </footer>
    </form>
  </Model>
</template>

<style scoped>
.form-row {
  display: flex;
  gap: 20px;
  align-items: center;
}
.form-row > label {
  flex: 1;
}
.author-note {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #8b987b;
  max-width: 45%;
  margin-top: 23px;
}
.selected-media {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.selected-media > button {
  position: relative;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
}
.selected-media > button > span {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  background: #294d3bba;
  color: white;
  font-size: 10px;
}
.library-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  max-height: 240px;
  overflow: auto;
  padding: 4px;
}
.library-grid > button {
  position: relative;
  padding: 0;
  border-radius: 7px;
  overflow: hidden;
  border: 2px solid transparent;
}
.library-grid > button.chosen {
  border-color: var(--green);
}
.library-grid > button > svg {
  position: absolute;
  top: 5px;
  right: 5px;
  background: var(--green);
  color: white;
  border-radius: 50%;
  padding: 2px;
}
@media (max-width: 760px) {
  .form-row {
    gap: 14px;
  }
  .author-note {
    font-size: 10px;
  }
  .selected-media,
  .library-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 540px) {
  .form-row {
    flex-wrap: wrap;
  }
  .form-row > label {
    flex-basis: 100%;
  }
  .author-note {
    margin-top: 0;
    max-width: 100%;
  }
}
</style>
