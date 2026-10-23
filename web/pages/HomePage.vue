<script setup lang="ts">
import { computed } from "vue";
import {
  ArrowUpRight,
  ArrowRight,
  PenLine,
  Plane,
  Heart,
  Camera,
  CalendarDays,
  ImagePlus,
} from "lucide-vue-next";
import { state, today, togetherDays, names, displayEvents } from "../store";
import { writeEntry, openViewer } from "../ui";
import { dateLabel } from "../../shared/dates";
import Avatar from "../components/Avatar.vue";
import JourneyArt from "../components/JourneyArt.vue";
import EntryCard from "../components/EntryCard.vue";
import MediaThumb from "../components/MediaThumb.vue";

const cover = computed(() =>
  state.media.find(
    (m) => m.id === state.settings.coverMediaId && m.kind === "image",
  ),
);
const upcoming = computed(() =>
  displayEvents.value.filter((e) => e.days >= 0).slice(0, 2),
);
const recent = computed(() =>
  [...state.entries]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 2),
);
const featured = computed(() =>
  state.media.filter((m) => m.featured).slice(0, 4),
);
</script>

<template>
  <section class="page-intro">
    <div>
      <span class="eyebrow">OUR LITTLE JOURNEY</span>
      <h1>把日子，写成我们的故事</h1>
      <p>有些瞬间很小，却值得被好好收藏。</p>
    </div>
    <button type="button" class="button primary" @click="writeEntry()">
      <PenLine :size="17" />记下今天
    </button>
  </section>
  <section class="home-hero">
    <div class="together-card">
      <div class="couple-avatars">
        <Avatar actor="her" large /><span class="couple-heart">
          <Heart :size="15" />
        </span>
        <Avatar actor="him" large />
      </div>
      <span class="couple-names">{{ names }}</span>
      <div class="days-label">
        {{ togetherDays > 0 ? "今天是我们在一起的" : "距离我们的故事开始还有" }}
      </div>
      <div class="big-day">
        <span>{{ togetherDays > 0 ? togetherDays : 1 - togetherDays }}</span>
        <span>天</span>
      </div>
      <p class="together-sub">{{ state.settings.intro }}</p>
      <div class="flight-line"><span /><Plane :size="21" /><span /></div>
      <div class="together-foot">
        <span>故事起点</span
        ><strong>{{ state.settings.startDate.replaceAll("-", ".") }}</strong>
      </div>
    </div>
    <div class="hero-postcard">
      <div class="postcard-image">
        <img
          v-if="cover"
          :src="cover.url"
          :alt="cover.caption || '我们的封面照片'"
        /><JourneyArt v-else /><span class="postcard-badge"
          ><Plane :size="12" />{{
            cover ? "OUR FAVORITE MOMENT" : "THE JOURNEY BEGINS"
          }}</span
        >
      </div>
      <div class="postcard-footer">
        <div>
          <strong>{{ cover?.caption || "下一张风景里，会有我们。" }}</strong>
          <span>{{
            cover
              ? "把喜欢的瞬间，留在手账的第一页"
              : "这里为你们的第一张封面照片留了一个位置"
          }}</span>
        </div>
        <RouterLink to="/settings" class="icon-button" aria-label="设置封面照片"
          ><ImagePlus :size="20"
        /></RouterLink>
      </div>
      <span class="tape tape-one" /><span class="tape tape-two" />
    </div>
  </section>
  <section class="upcoming-strip">
    <div class="strip-label">
      <CalendarDays :size="20" /><span
        >值得期待<br /><small>COMING SOON</small></span
      >
    </div>
    <RouterLink
      v-for="event in upcoming"
      :key="event.id"
      to="/anniversaries"
      class="upcoming-item"
    >
      <span
        ><small>{{ dateLabel(event.nextDate) }}</small
        ><strong>{{ event.title }}</strong></span
      ><span class="countdown-small"
        ><b>{{ event.days === 0 ? "今天" : event.days }}</b
        ><small>{{ event.days === 0 ? "就是这一天" : "天后" }}</small></span
      >
    </RouterLink>
    <RouterLink
      to="/anniversaries"
      class="strip-more"
      aria-label="查看所有纪念日"
      ><ArrowUpRight :size="20"
    /></RouterLink>
  </section>
  <section class="home-content-grid">
    <div>
      <div class="section-heading">
        <div>
          <span class="eyebrow">RECENT PAGES</span>
          <h2>最近留下的几笔</h2>
        </div>
        <RouterLink to="/calendar" class="text-button"
          >翻翻日历<ArrowRight :size="15"
        /></RouterLink>
      </div>
      <div v-if="recent.length" class="rencent-stack">
        <EntryCard
          v-for="entry in recent"
          :key="entry.id"
          :entry="entry"
          compact
        />
      </div>
      <div v-else class="empty-paper">
        <span class="empty-icon"><PenLine :size="26" /></span>
        <h3>每段故事，都从第一笔开始。</h3>
        <p>今天一起做了什么？<br />一句话、一张照片，都值得留下。</p>
        <button type="button" class="text-button" @click="writeEntry(today)">
          写下第一条记录<ArrowRight :size="15" /></button
        ><span class="paper-lines" />
      </div>
    </div>
    <div>
      <div class="section-heading">
        <div>
          <span class="eyebrow">COLLECTED MOMENTS</span>
          <h2>沿途的小收藏</h2>
        </div>
        <RouterLink to="/album" class="text-button"
          >全部相册<ArrowRight :size="15"
        /></RouterLink>
      </div>
      <div v-if="featured.length" class="featured-grid">
        <button
          v-for="m in featured"
          :key="m.id"
          type="button"
          class="featured-item"
          :aria-label="`查看${m.caption || m.name}`"
          @click="openViewer(m.id)"
        >
          <MediaThumb :media="m" /><span>{{
            m.caption || "一个喜欢的瞬间"
          }}</span>
        </button>
      </div>
      <div v-else class="empty-album">
        <div class="photo-stack">
          <div />
          <div><Camera :size="33" stroke-width="1.3" /></div>
        </div>
        <h3>把喜欢的瞬间，放进这里</h3>
        <p>在相册中点亮收藏，<br />它就会出现在这一页。</p>
        <RouterLink to="/album" class="button secondary"
          >去收藏一个瞬间<ArrowUpRight :size="16"
        /></RouterLink>
      </div>
    </div>
  </section>
  <div class="end-note">
    <span />不必赶路，我们慢慢记录<Plane :size="15" /><span />
  </div>
</template>
