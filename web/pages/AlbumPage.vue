<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Plus,
  UploadCloud,
  Heart,
  Images,
  FolderPlus,
  Pencil,
  Trash2,
  ArrowUpRight,
} from "lucide-vue-next";
import { state, notify } from "../store";
import { confirmDialog, viewerId } from "../ui";
import { api } from "../api";
import { Album, Media } from "../../shared/types";
import Model from "../components/Model.vue";
import UploadBox from "../components/UploadBox.vue";
import MediaThumb from "../components/MediaThumb.vue";

const filter = ref("all");
const selectedAlbum = computed(() =>
  state.albums.find((a) => a.id === filter.value),
);
const displayed = computed(() =>
  state.media.filter(
    (m) =>
      filter.value === "all" ||
      (filter.value === "featured"
        ? m.featured
        : filter.value === "loose"
          ? !m.albumId
          : m.albumId === filter.value),
  ),
);
const uploadOpen = ref(false);
const uploading = ref(false);
const uploadAlbum = ref<string | null>(null);
const albumOpen = ref(false);
const editingAlbum = ref<Album | null>(null);
const albumForm = ref({ name: "", description: "" });
const editingMedia = ref<Media | null>(null);
const mediaForm = ref({
  caption: "",
  date: "",
  albumId: null as string | null,
  featured: false,
});
const saving = ref(false);
const error = ref("");
const toggling = ref(new Set<string>());
function openUpload() {
  uploadAlbum.value = selectedAlbum.value?.id ?? null;
  uploadOpen.value = true;
}
function openAlbum(album: Album | null = null) {
  editingAlbum.value = album;
  albumForm.value = album
    ? { name: album.name, description: album.description }
    : { name: "", description: "" };
  error.value = "";
  albumOpen.value = true;
}
const openMedia = (media: Media) => {
  editingMedia.value = media;
  mediaForm.value = {
    caption: media.caption,
    date: media.date || "",
    albumId: media.albumId,
    featured: media.featured,
  };
  error.value = "";
};
async function saveAlbum() {
  if (!albumForm.value.name.trim()) {
    error.value = "请填写相册名称。";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const a = await api<Album>(
      editingAlbum.value
        ? `/api/albums/${editingAlbum.value.id}`
        : "/api/albums",
      editingAlbum.value ? "PATCH" : "POST",
      {
        ...albumForm.value,
        ...(editingAlbum.value ? { version: editingAlbum.value.version } : {}),
      },
    );
    state.albums = [...state.albums.filter((v) => v.id !== a.id), a];
    filter.value = a.id;
    albumOpen.value = false;
    notify("相册已经准备好了");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
async function saveMedia() {
  if (!editingMedia.value) return;
  saving.value = true;
  error.value = "";
  try {
    const m = await api<Media>(`/api/media/${editingMedia.value.id}`, "PATCH", {
      ...mediaForm.value,
      date: mediaForm.value.date || null,
      version: editingMedia.value.version,
    });
    state.media = state.media.map((value) => (value.id === m.id ? m : value));
    editingMedia.value = null;
    notify("这一刻的说明已保存");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
async function toggleFeatured(media: Media) {
  if (toggling.value.has(media.id)) return;
  toggling.value.add(media.id);
  try {
    const m = await api<Media>(`/api/media/${media.id}`, "PATCH", {
      albumId: media.albumId,
      caption: media.caption,
      date: media.date,
      featured: !media.featured,
      version: media.version,
    });
    state.media = state.media.map((value) => (value.id === m.id ? m : value));
  } catch (e) {
    notify((e as Error).message);
  } finally {
    toggling.value.delete(media.id);
  }
}
async function deleteAlbum() {
  const a = selectedAlbum.value;
  if (!a) return;
  if (
    !(await confirmDialog(
      `删除「${a.name}」？非空相册需要先移出其中的媒体。`,
      { danger: true, confirmText: "删除相册" },
    ))
  )
    return;
  try {
    await api(`/api/albums/${a.id}?version=${a.version}`, "DELETE");
    state.albums = state.albums.filter((value) => value.id !== a.id);
    filter.value = "all";
    notify("空相册已删除");
  } catch (e) {
    notify((e as Error).message);
  }
}
async function deleteMedia(media: Media) {
  if (
    !(await confirmDialog(
      "永久删除这个媒体文件？删除后无法恢复。被日记或封面引用的文件需要先解除关联。",
      { danger: true, confirmText: "删除" },
    ))
  )
    return;
  try {
    await api(`/api/media/${media.id}?version=${media.version}`, "DELETE");
    state.media = state.media.filter((value) => value.id !== media.id);
    notify("媒体已删除");
  } catch (e) {
    notify((e as Error).message);
  }
}
</script>

<template>
  <section class="page-intro">
    <div>
      <span class="eyebrow">LITTLE THINGS, BIG MEMORIES</span>
      <h1>沿途的光，都收在这里</h1>
      <p>那些不想忘记的照片，和按下录制的瞬间。</p>
    </div>
    <button class="button primary" @click="openUpload">
      <UploadCloud :size="17" />上传瞬间
    </button>
  </section>
  <div class="album-toolbar">
    <div class="filter-tabs" role="group" aria-label="相册筛选">
      <button
        :class="{ active: filter === 'all' }"
        :aria-pressed="filter === 'all'"
        @click="filter = 'all'"
      >
        <Images :size="15" />全部瞬间<span>{{ state.media.length }}</span>
      </button>
      <button
        :class="{ active: filter === 'featured' }"
        :aria-pressed="filter === 'featured'"
        @click="filter = 'featured'"
      >
        <Heart :size="15" />精选收藏
      </button>
      <button
        v-for="album in state.albums"
        :key="album.id"
        :class="{ active: filter === album.id }"
        :aria-pressed="filter === album.id"
        @click="filter = album.id"
      >
        {{ album.name }}
      </button>
      <button
        v-if="state.media.some((m) => !m.albumId)"
        :class="{ active: filter === 'loose' }"
        @click="filter = 'loose'"
      >
        未归类
      </button>
    </div>
    <button class="text-button" @click="openAlbum()">
      <FolderPlus :size="17" />新建相册
    </button>
  </div>
  <div v-if="selectedAlbum" class="album-heading">
    <div>
      <h2>{{ selectedAlbum.name }}</h2>
      <p>{{ selectedAlbum.description || "一起收集属于这个主题的回忆。" }}</p>
    </div>
    <div class="button-row">
      <button
        class="icon-button"
        aria-label="编辑相册"
        @click="openAlbum(selectedAlbum)"
      >
        <Pencil :size="16" />
      </button>
      <button class="icon-button" aria-label="删除相册" @click="deleteAlbum">
        <Trash2 :size="16" />
      </button>
    </div>
  </div>
  <div v-if="displayed.length" class="album-grid">
    <article v-for="media in displayed" :key="media.id" class="photo-card">
      <button
        class="photo-open"
        :aria-label="`查看${media.caption || media.name}`"
        @click="viewerId = media.id"
      >
        <MediaThumb :media="media" />
      </button>
      <button
        :class="['favorite-button', { selected: media.featured }]"
        :aria-label="media.featured ? '取消精选' : '设为精选'"
        :aria-pressed="media.featured"
        :disabled="toggling.has(media.id)"
        @click="toggleFeatured(media)"
      >
        <Heart :size="17" :fill="media.featured ? 'currentColor' : 'none'" />
      </button>
      <div class="photo-caption">
        <strong>{{ media.caption || media.name }}</strong>
        <div>
          <RouterLink v-if="media.date" :to="`/calendar?date=${media.date}`">
            {{ media.date.replaceAll("-", ".") }}
            <ArrowUpRight :size="11" />
          </RouterLink>
          <span v-else>未来日期</span>
          <div class="photo-actions">
            <button
              class="icon-button"
              aria-label="编辑媒体说明"
              @click="openMedia(media)"
            >
              <Pencil :size="14" />
            </button>
            <button
              class="icon-button"
              aria-label="删除媒体"
              @click="deleteMedia(media)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </article>
  </div>
  <div v-else class="album-empty">
    <div class="photo-stack">
      <div />
      <div><Images :size="42" stroke-width="1.2" /></div>
    </div>
    <span class="eyebrow">A PLACE FOR OUR MEMORIES</span>
    <h2>
      {{
        filter === "featured"
          ? "给喜欢的瞬间，一颗小小的心。"
          : "第一张照片，会是什么呢？"
      }}
    </h2>
    <p>
      {{
        filter === "featured"
          ? "在全部瞬间中点亮爱心，精选就会出现在这里和首页。"
          : "照片也好，视频也好。想把留住的那一刻放进来。"
      }}
    </p>
    <button
      class="button secondary"
      @click="filter === 'featured' ? (filter = 'all') : openUpload()"
    >
      {{ filter === "featured" ? "去挑选喜欢的瞬间" : "上传第一份回忆" }}
      <Plus :size="16" />
    </button>
  </div>
  <Model
    v-if="uploadOpen"
    title="收进一份回忆"
    :busy="uploading"
    @close="uploadOpen = false"
    ><label class="upload-album-select"
      >放进哪个相册<select v-model="uploadAlbum" :disabled="uploading">
        <option :value="null">暂不归类</option>
        <option v-for="a in state.albums" :key="a.id" :value="a.id">
          {{ a.name }}
        </option>
      </select></label
    ><UploadBox :albumId="uploadAlbum" @busy="uploading = $event" />
    <div class="form-footer">
      <button
        class="button primary"
        @click="uploadOpen = false"
        :disabled="uploading"
      >
        {{ uploading ? "等待上传完成…" : "完成" }}
      </button>
    </div>
  </Model>
  <Model
    v-if="albumOpen"
    :title="editingAlbum ? '修改相册' : '给回忆一个名字'"
    :busy="saving"
    @close="albumOpen = false"
  >
    <form class="form-stack" novalidate @submit.prevent="saveAlbum">
      <label>
        相册名称<input
          v-model="albumForm.name"
          aria-label="相册名称"
          required
          maxlength="100"
          placeholder="例如：球场边"
        />
      </label>
      <label>
        相册介绍<textarea
          v-model="albumForm.description"
          aria-label="相册介绍"
          maxlength="2000"
          rows="3"
          placeholder="选填，给这些瞬间写一句话。"
        />
      </label>
      <p v-if="error" role="alert" class="error-text">{{ error }}</p>
      <footer class="form-footer">
        <button class="button primary" :disabled="saving">
          {{ saving ? "正在保存…" : "保存相册" }}
        </button>
      </footer>
    </form>
  </Model>
  <Model
    v-if="editingMedia"
    title="给这个瞬间添一句话"
    :busy="saving"
    @close="editingMedia = null"
  >
    <form class="form-stack" @submit.prevent="saveMedia">
      <label>
        说明<textarea
          v-model="mediaForm.caption"
          aria-label="媒体说明"
          maxlength="2000"
          rows="3"
        />
      </label>
      <label
        >这一天（可不填）<input
          v-model="mediaForm.date"
          aria-label="媒体日期"
          type="date"
          min="1900-01-01"
          max="2099-12-31"
      /></label>
      <label
        >所属相册<select v-model="mediaForm.albumId">
          <option :value="null">暂不归类</option>
          <option v-for="a in state.albums" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select></label
      >
      <label class="checkbox-label">
        <input type="checkbox" v-model="mediaForm.featured" />
        精选到首页
      </label>
      <p v-if="error" role="alert" class="error-text">{{ error }}</p>
      <footer class="form-footer">
        <button class="button primary" :disabled="saving">
          {{ saving ? "正在保存…" : "保存说明" }}
        </button>
      </footer>
    </form>
  </Model>
</template>
