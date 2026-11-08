<script setup lang="ts">
import { ref, onBeforeUnmount } from "vue";
import { UploadCloud, X, RotateCcw, Check, BusFront } from "lucide-vue-next";
import { uploadFile } from "../api";
import { state } from "../store";
import type { Media } from "../../shared/types";
const props = defineProps<{
  albumId?: string | null;
  date?: string;
}>();
const emit = defineEmits<{
  uploaded: [media: Media];
  busy: [busy: boolean];
}>();
type Job = {
  id: number;
  file: File;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  error: string;
};
const jobs = ref<Job[]>([]);
const input = ref<HTMLInputElement>();
const busy = ref(false);
let controller: AbortController | null = null;
let serial = 0;
let destroyed = false;
async function run() {
  if (busy.value) return;
  busy.value = true;
  emit("busy", true);
  for (const job of jobs.value.filter((j) => j.status === "waiting")) {
    if (destroyed) break;
    job.status = "uploading";
    job.error = "";
    controller = new AbortController();
    try {
      const media = await uploadFile(
        job.file,
        props.albumId || null,
        props.date || "",
        (p) => {
          job.progress = p;
        },
        controller.signal,
      );
      if (!state.media.some((m) => m.id === media.id))
        state.media.unshift(media);
      job.status = "done";
      emit("uploaded", media);
    } catch (e) {
      job.status = "error";
      job.error = (e as Error).message;
    }
  }
  busy.value = false;
  controller = null;
  emit("busy", false);
}
function select(files: FileList | null) {
  if (!files) return;
  jobs.value.push(
    ...Array.from(files).map((file) => ({
      id: serial++,
      file,
      progress: 0,
      status: "waiting" as const,
      error: "",
    })),
  );
  if (input.value) input.value.value = "";
  void run();
}
function retry(job: Job) {
  job.status = "waiting";
  job.progress = 0;
  void run();
}
function cancelUpload() {
  controller?.abort();
}
function onFileChange(event: Event) {
  select((event.target as HTMLInputElement).files);
}
onBeforeUnmount(() => {
  destroyed = true;
  controller?.abort();
});
</script>

<template>
  <div class="upload-box">
    <button
      type="button"
      class="upload-drop"
      :disabled="busy"
      @click="input?.click()"
    >
      <UploadCloud :size="25" /><span>{{
        busy ? "正在保存沿途的瞬间…" : "选择图片或视频"
      }}</span
      ><small>JPEG / PNG / WEBP / GIF / MP4 / WebM / MOV</small>
    </button>
    <input
      ref="input"
      aria-label="选择上传文件"
      type="file"
      multiple
      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
      class="sr-only"
      :disabled="busy"
      @change="onFileChange"
    />
    <p class="field-hint">
      视频推荐 MP4（H.264 / AAC），不自动转码。上传成功的文件会保存在相册中。
    </p>
    <div v-for="job in jobs" :key="job.id" class="upload-job">
      <div>
        <span class="file-name">{{ job.file.name }}</span>
        <small v-if="job.status === 'uploading'">{{
          job.progress === 100 ? "正在处理…" : `${job.progress}%`
        }}</small
        ><Check v-if="job.status === 'done'" :size="16" class="success-text" />
      </div>
      <progress
        v-if="job.status === 'uploading'"
        :value="job.progress"
        max="100"
      />
      <p v-if="job.error" class="error-text">{{ job.error }}</p>
      <button
        v-if="job.status === 'uploading'"
        type="button"
        class="text-button"
        @click="cancelUpload"
      >
        <X :size="14" />取消此文件
      </button>
      <button
        v-if="job.status === 'error'"
        type="button"
        class="text-button"
        :disabled="busy"
        @click="retry(job)"
      >
        <RotateCcw :size="14" />重试此文件
      </button>
    </div>
  </div>
</template>

<style scoped>
.upload-drop {
  width: 100%;
  padding: 24px 15px;
  border: 1px dashed #bccbab;
  background: #edf1e57a;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #839775;

  > span {
    font-size: 13px;
    color: #5b7550;
  }

  > small {
    font-size: 9px;
    color: #9ba28b;
  }
}
.upload-box > .field-hint {
  margin-top: 10px;
}
.upload-job {
  margin-top: 12px;
  border: 1px solid #e0e5d2;
  border-radius: 7px;
  padding: 10px;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  small {
    font-size: 10px;
    white-space: nowrap;
  }

  progress {
    width: 100%;
    height: 6px;
    display: block;
    margin: 9px 0;
    appearance: none;
    -webkit-appearance: none;
    border: none;
    border-radius: 999px;
    overflow: hidden;
    background: #e6eadb;
  }

  .text-button {
    min-height: 26px;
    font-size: 10px;
  }

  .error-text {
    font-size: 11px;
    margin-top: 5px;
  }
}
.upload-job progress::-webkit-progress-bar {
  background: #e6eadb;
  border-radius: 999px;
}
.upload-job progress::-webkit-progress-value {
  background: var(--green);
  border-radius: 999px;
  transition: width 0.2s ease;
}
.upload-job progress::-moz-progress-bar {
  background: var(--green);
  border-radius: 999px;
}
.file-name {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
