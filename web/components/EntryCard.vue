<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Pencil, Trash2, Image as ImageIcon } from "lucide-vue-next";
import { state, actor, notify } from "../store";
import { confirmDialog, writeEntry, openViewer } from "../ui";
import { api } from "../api";
import { dateLabel } from "../../shared/dates";
import type { Entry } from "../../shared/types";
import Avatar from "./Avatar.vue";
import MediaThumb from "./MediaThumb.vue";
const props = defineProps<{
  entry: Entry;
  compact?: boolean;
  unread?: boolean;
  flash?: boolean;
}>();
const profile = computed(() =>
  state.profiles.find((p) => p.id === props.entry.authorId),
);
const media = computed(() =>
  props.entry.mediaIds
    .map((id) => state.media.find((m) => m.id === id))
    .filter((m) => !!m),
);
const shown = computed(() =>
  media.value.slice(0, props.compact ? 3 : undefined),
);
const open = (id: string) =>
  openViewer(
    id,
    shown.value.map((m) => m.id),
  );
const router = useRouter();
function onCardClick(e: MouseEvent) {
  if (!props.compact) return;
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const target = e.target as HTMLElement | null;
  // 图片预览、操作按钮和底部链接自己处理点击
  if (target?.closest("button, a, input, textarea, select")) return;
  if (window.getSelection()?.toString()) return;
  router.push({
    path: "/calendar",
    query: { date: props.entry.date, entry: props.entry.id },
  });
}
const editedLabel = computed(() => {
  const date = new Date(props.entry.updatedAt);
  if (Number.isNaN(date.getTime())) return dateLabel(props.entry.date, true);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
});
const deleting = ref(false);
const error = ref("");
async function remove() {
  if (
    !(await confirmDialog("删除这条记录？关联的图片和视频仍保留在相册中。", {
      danger: true,
      confirmText: "删除",
    }))
  )
    return;
  deleting.value = true;
  try {
    await api(
      `/api/entries/${props.entry.id}?version=${props.entry.version}`,
      "DELETE",
    );
    state.entries = state.entries.filter((e) => e.id !== props.entry.id);
    notify("记录已删除，媒体仍在相册里");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <article
    :class="['entry-card', { compact, flash }]"
    :data-entry-id="entry.id"
    @click="onCardClick"
  >
    <span
      v-if="unread"
      :class="['entry-unread-dot', entry.authorId]"
      role="img"
      aria-label="这条记录还没看"
    />
    <header>
      <Avatar :actor="entry.authorId" />
      <div>
        <strong>{{ profile?.nickname }}</strong>
        <span v-if="compact">{{ dateLabel(entry.date, true) }}</span>
        <span v-else>编辑于 {{ editedLabel }}</span>
      </div>
      <div v-if="!compact && actor === entry.authorId" class="entry-actions">
        <button
          type="button"
          class="icon-button"
          aria-label="编辑记录"
          @click="writeEntry(entry.date, entry)"
        >
          <Pencil :size="15" />
        </button>
        <button
          type="button"
          class="icon-button danger-hover"
          aria-label="删除记录"
          @click="remove"
          :disabled="deleting"
        >
          <Trash2 :size="15" />
        </button>
      </div>
    </header>
    <p v-if="entry.body" :class="['entry-body', { clamped: compact }]">
      {{ entry.body }}
    </p>
    <div v-if="media.length" :class="['entry-images', { small: compact }]">
      <button
        v-for="item in shown"
        :key="item.id"
        type="button"
        :aria-label="`查看${item.caption || item.name}`"
        @click="open(item.id)"
      >
        <MediaThumb :media="item" />
      </button>
    </div>
    <RouterLink
      v-if="compact"
      class="entry-link"
      :to="`/calendar?date=${entry.date}`"
    >
      翻到这一天<span>↗</span>
    </RouterLink>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
  </article>
</template>

<style scoped>
.entry-card {
  position: relative;
  background: #fffdf7;
  border: 1px solid #e1e4d5;
  border-radius: 12px;
  padding: 20px;
  min-width: 0;

  &.compact {
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s;

    .entry-images > button,
    .entry-link {
      cursor: pointer;
    }
  }

  &.flash {
    animation: entry-card-flash 0.55s ease-in-out 1;
  }

  header {
    display: flex;
    align-items: center;
    gap: 10px;

    > div:nth-child(2) {
      flex: 1;
      min-width: 0;
    }

    strong {
      font-size: 12px;
      display: block;
    }

    span {
      display: block;
      font-size: 10px;
      color: #65715f;
      margin-top: 4px;
    }
  }

  .icon-button {
    width: 32px;
    height: 32px;
  }
}

@media (hover: hover) {
  .entry-card.compact:hover {
    border-color: #cdd6bc;
    background: #fffef9;
  }
}

@keyframes entry-card-flash {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.entry-unread-dot {
  position: absolute;
  top: 20px;
  right: 19px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dot-her);

  &.him {
    background: var(--dot-him-soft);
    opacity: 1;
  }
}

.entry-actions {
  display: flex;
  gap: 2px;
}

.entry-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.95;
  margin-top: 16px;
  color: #4f6050;

  &.clamped {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.entry-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 15px;

  > button {
    padding: 0;
    border-radius: 7px;
    overflow: hidden;
  }

  .media-thumb {
    aspect-ratio: 1;
  }

  &.small .media-thumb {
    aspect-ratio: 1.3;
  }
}

.entry-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: #819075;
  margin-top: 17px;
}
@media (max-width: 760px) {
  .entry-card {
    padding: 18px;
  }
  .entry-body {
    font-size: 13px;
  }
  .entry-images .media-thumb {
    aspect-ratio: 1;
  }
  .entry-card header span {
    font-size: 11px;
  }
}
</style>
