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
import {
  state,
  today,
  togetherDays,
  names,
  displayEvents,
  isUnread,
  unreadEntries,
} from "../store";
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
// 未读按人分开计数，圆点颜色跟着是谁的记录走
const unreadByRole = computed(() =>
  state.profiles
    .map((profile) => ({
      id: profile.id,
      nickname: profile.nickname,
      count: unreadEntries.value.filter((e) => e.authorId === profile.id)
        .length,
    }))
    .filter((item) => item.count > 0),
);
const unreadLabel = computed(() =>
  unreadByRole.value
    .map((item) => `${item.nickname} ${item.count} 条未读`)
    .join("，"),
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
          <h2 class="recent-heading">
            最近留下的几笔<span
              v-if="unreadByRole.length"
              class="unread-badges"
              role="status"
              :aria-label="unreadLabel"
            >
              <span
                v-for="item in unreadByRole"
                :key="item.id"
                :class="['unread-badge', item.id]"
                :title="`${item.nickname}新写或改动了 ${item.count} 条记录`"
                >{{ item.count }}</span
              >
            </span>
          </h2>
        </div>
        <RouterLink to="/calendar" class="text-button"
          >翻翻日历<ArrowRight :size="15"
        /></RouterLink>
      </div>
      <div v-if="recent.length" class="recent-stack">
        <EntryCard
          v-for="entry in recent"
          :key="entry.id"
          :entry="entry"
          :unread="isUnread(entry)"
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

<style scoped>
.home-hero {
  display: grid;
  grid-template-columns: 0.82fr 1.25fr;
  gap: 25px;
  align-items: stretch;
}
.together-card {
  position: relative;
  padding: 26px 28px 19px;
  border-radius: 15px;
  background: #e9eddf;
  border: 1px solid #dce2d0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.together-card:before {
  content: "";
  position: absolute;
  width: 170px;
  height: 170px;
  right: -86px;
  top: -90px;
  border: 1px solid #c4cfb466;
  border-radius: 50%;
  box-shadow:
    0 0 0 20px #c4cfb420,
    0 0 0 41px #c4cfb413;
}
.couple-avatars {
  display: flex;
  align-items: center;
  gap: 9px;
}
.couple-heart {
  color: #b2986b;
  background: #f6f2df;
  border-radius: 50%;
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
}
.couple-names {
  font-size: 13px;
  margin-top: 14px;
  color: #5a705a;
  letter-spacing: 0.03em;
}
.days-label {
  font-size: 12px;
  letter-spacing: 0.12em;
  margin-top: 22px;
  color: #65715f;
}
.big-day {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 3px;
  line-height: 1.1;
}
.big-day span:first-child {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(68px, 7vw, 94px);
  font-weight: 400;
  color: #375743;
  letter-spacing: -0.035em;
}
.big-day span:last-child {
  font-size: 16px;
  color: #7e8c70;
}
.together-sub {
  font-size: 11px;
  line-height: 1.9;
  color: #65715f;
  margin-top: 10px;
  text-align: center;
  overflow-wrap: anywhere;
  max-width: 100%;
}
.flight-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  width: 85%;
  color: #a9b38d;
  margin-top: auto;
  padding-top: 17px;
  padding-bottom: 14px;
}
.flight-line span {
  border-bottom: 1px dashed #bec6a7;
  flex: 1;
}
.flight-line svg {
  transform: rotate(-13deg);
}
.together-foot {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #65715f;
}
.together-foot strong {
  font-family: monospace;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.09em;
}
.hero-postcard {
  position: relative;
  padding: 12px 12px 0;
  background: var(--white);
  border: 1px solid #e6e5d9;
  border-radius: 5px;
  box-shadow: 0 5px 15px #3e513c08;
  transform: rotate(0.8deg);
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.postcard-image {
  position: relative;
  aspect-ratio: 1.67;
  flex: 1;
  overflow: hidden;
  background: #e3e8dc;
  min-height: 240px;
}
.postcard-image > img,
.postcard-image > .journey-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.postcard-badge {
  position: absolute;
  top: 15px;
  left: 15px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 9px;
  background: #f5f5e5d9;
  color: #58705f;
  font-size: 8px;
  letter-spacing: 0.13em;
  border: 1px solid #ffffff55;
}
.postcard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 8px 17px;
}
.postcard-footer strong {
  font-size: 13px;
  display: block;
  line-height: 1.6;
}
.postcard-footer span {
  display: block;
  font-size: 10px;
  color: #65715f;
  line-height: 1.6;
  margin-top: 5px;
}
.tape {
  position: absolute;
  width: 73px;
  height: 24px;
  background: #dacba16b;
  transform: rotate(-22deg);
  top: -4px;
  left: -17px;
  backdrop-filter: blur(1px);
}
.tape-two {
  left: auto;
  right: -15px;
  top: auto;
  bottom: 21px;
  transform: rotate(-35deg);
  width: 45px;
  height: 19px;
}
.upcoming-strip {
  display: flex;
  align-items: stretch;
  border: 1px solid #e2e3d5;
  border-radius: 11px;
  background: #fdfbf4;
  margin: 28px 0 35px;
  overflow: hidden;
}
.strip-label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 150px;
  padding: 21px 24px;
  color: #8d957c;
  background: #f1f1e6;
}
.strip-label > span {
  font-size: 12px;
  color: #68785e;
  line-height: 1.8;
}
.strip-label small {
  font-size: 7px;
  letter-spacing: 0.14em;
  color: #929a84;
}
.upcoming-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 19px 28px;
  gap: 25px;
  flex: 1;
  border-left: 1px dashed #dedfce;
}
@media (hover: hover) {
  .upcoming-item:hover {
    background: #f6f5ec;
  }
}
.upcoming-item > span:first-child small {
  font-size: 10px;
  display: block;
  color: #8a9280;
  margin-bottom: 7px;
}
.upcoming-item strong {
  font-size: 12px;
  font-weight: 500;
}
.countdown-small {
  text-align: right;
  display: flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
}
.countdown-small b {
  font-family: Georgia, serif;
  font-size: 29px;
  font-weight: 400;
  color: #a1854d;
}
.countdown-small small {
  font-size: 9px;
  color: #92977f;
}
.strip-more {
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-left: 1px dashed #e0e1d2;
  color: #8c9579;
}
.home-content-grid {
  display: grid;
  grid-template-columns: 1.12fr 1fr;
  gap: 30px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 19px;
}
.section-heading .eyebrow {
  font-size: 8px;
  letter-spacing: 0.18em;
  margin-bottom: 5px;
}
.section-heading h2 {
  font-size: 19px;
}
.section-heading > .text-button {
  font-size: 10px;
}
/* 让未读圆点与 h2 文字视觉中心对齐 */
.recent-heading {
  display: flex;
  align-items: center;
}
.unread-badges {
  display: inline-flex;
  align-items: center;
}
.unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  border-radius: 50%;
  background: var(--dot-her);
  color: var(--paper);
  opacity: 0.9;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}
/* 谁写的记录，就用谁的颜色：绿色是她，金色是他 */
.unread-badge.her {
  background: var(--dot-her);
}
.unread-badge.him {
  background: var(--dot-him-soft);
  opacity: 1;
  color: #ffffff;
}
.empty-paper {
  position: relative;
  border: 1px solid #e4e3d6;
  border-radius: 10px;
  background: #fffdf6;
  min-height: 262px;
  padding: 26px;
  overflow: hidden;
}
.empty-icon {
  display: inline-flex;
  width: 43px;
  height: 43px;
  align-items: center;
  justify-content: center;
  border: 1px dashed #c9cdb7;
  border-radius: 50%;
  color: #8a997c;
  margin-bottom: 13px;
}
.empty-paper h3 {
  font-size: 15px;
}
.empty-paper p {
  font-size: 12px;
  color: #65715f;
  line-height: 1.9;
  margin: 9px 0 10px;
}
.paper-lines {
  position: absolute;
  width: 115px;
  height: 100px;
  right: 26px;
  bottom: 32px;
  background: repeating-linear-gradient(
    0deg,
    transparent 0,
    transparent 18px,
    #dedfd138 18px,
    #dedfd138 19px
  );
  transform: rotate(-5deg);
  pointer-events: none;
}
.empty-album {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  background: #eeeee350;
  border: 1px dashed #d7dcc9;
  border-radius: 10px;
  padding: 25px;
  min-height: 262px;
  text-align: center;
}
.photo-stack {
  position: relative;
  width: 106px;
  height: 91px;
  margin: 8px auto 18px;
}
.photo-stack > div {
  position: absolute;
  inset: 0;
  background: #fdfbf2;
  border: 1px solid #d9decd;
  box-shadow: 0 2px 6px #28462d09;
  transform: rotate(-12deg);
}
.photo-stack > div:last-child {
  inset: 0 5px 3px;
  background: #e6e9dc;
  border: 7px solid #fffdf6;
  border-bottom-width: 18px;
  outline: 1px solid #d9decd;
  transform: rotate(9deg);
  display: grid;
  place-items: center;
  color: #a2ad94;
}
.empty-album h3 {
  font-size: 13px;
}
.empty-album p {
  font-size: 11px;
  line-height: 1.9;
  color: #65715f;
  margin: 6px 0 12px;
}
.empty-album .button {
  font-size: 11px;
  padding: 8px 15px;
  min-height: 36px;
}
.end-note {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  color: #a0a690;
  font-size: 10px;
  letter-spacing: 0.1em;
  margin: 36px 0 0;
}
.end-note span {
  width: 40px;
  height: 1px;
  background: #dadfcf;
}
.featured-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.featured-item {
  background: var(--white);
  padding: 7px 7px 12px;
  border: 1px solid #e0e3d5;
  border-radius: 3px;
  text-align: left;
}
.featured-item:nth-child(2n) {
  transform: rotate(1deg);
}
.featured-item > span {
  display: block;
  margin: 10px 3px 0;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.featured-item .media-thumb {
  aspect-ratio: 1.1;
}
.recent-stack {
  display: grid;
  gap: 5px;
}

@media (min-width: 1500px) {
  .home-hero {
    gap: 32px;
  }
  .together-card {
    padding-top: 35px;
    padding-bottom: 25px;
  }
  .postcard-image {
    min-height: 300px;
  }
  .big-day span:first-child {
    font-size: 108px;
  }
  .together-sub {
    margin-bottom: 8px;
  }
  .home-content-grid {
    gap: 35px;
  }
  .empty-paper,
  .empty-album {
    min-height: 280px;
  }
}
@media (max-width: 1200px) {
  .home-hero {
    gap: 20px;
  }
  .together-card {
    padding: 23px 20px 18px;
  }
  .upcoming-item {
    padding: 18px;
    gap: 13px;
  }
  .strip-label {
    min-width: 120px;
    padding: 18px 17px;
  }
  .strip-label small {
    font-size: 6px;
  }
  .home-content-grid {
    gap: 22px;
  }
}
@media (max-width: 1000px) {
  .home-hero {
    grid-template-columns: 0.9fr 1.1fr;
    gap: 17px;
  }
  .together-card {
    padding: 20px 18px 17px;
  }
  .couple-avatars .avatar.large {
    width: 53px;
    height: 53px;
  }
  .days-label {
    margin-top: 16px;
    font-size: 10px;
  }
  .big-day span:first-child {
    font-size: 74px;
  }
  .postcard-image {
    min-height: 240px;
  }
  .postcard-footer {
    padding: 13px 4px;
  }
  .postcard-footer strong {
    font-size: 11px;
  }
  .postcard-footer span {
    font-size: 9px;
  }
  .together-sub {
    font-size: 10px;
  }
  .couple-names {
    font-size: 11px;
  }
  .upcoming-strip {
    flex-wrap: wrap;
  }
  .strip-label {
    min-width: 110px;
    padding: 14px;
  }
  .upcoming-item {
    padding: 17px 12px;
  }
  .upcoming-item strong {
    font-size: 11px;
  }
  .countdown-small b {
    font-size: 25px;
  }
  .countdown-small small {
    font-size: 8px;
  }
  .strip-more {
    padding: 0 9px;
  }
  .home-content-grid {
    gap: 18px;
  }
  .section-heading h2 {
    font-size: 17px;
  }
  .section-heading > .text-button {
    font-size: 9px;
  }
  .empty-paper,
  .empty-album {
    padding: 20px;
  }
}
@media (max-width: 760px) {
  .home-hero {
    grid-template-columns: 0.82fr 1.1fr;
    gap: 16px;
  }
  .together-card {
    padding: 21px 17px 17px;
  }
  .big-day span:first-child {
    font-size: 72px;
  }
  .postcard-image {
    min-height: 215px;
  }
  .couple-avatars {
    gap: 6px;
  }
  .couple-avatars .avatar.large {
    width: 50px;
    height: 50px;
  }
  .couple-heart {
    width: 22px;
    height: 22px;
  }
  .couple-heart svg {
    width: 12px;
  }
  .upcoming-strip {
    margin: 24px 0 29px;
  }
  .upcoming-item {
    padding: 18px 16px;
  }
  .home-content-grid {
    gap: 20px;
  }
  .end-note {
    margin-top: 29px;
    font-size: 9px;
  }
}
@media (max-width: 540px) {
  .home-hero {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .together-card {
    padding: 23px 24px 20px;
    min-height: 290px;
  }
  .couple-avatars .avatar.large {
    width: 56px;
    height: 56px;
  }
  .couple-avatars {
    gap: 13px;
  }
  .couple-names {
    margin-top: 11px;
    font-size: 12px;
  }
  .days-label {
    margin-top: 16px;
    font-size: 11px;
  }
  .big-day span:first-child {
    font-size: 84px;
  }
  .together-sub {
    font-size: 11px;
    margin-top: 5px;
  }
  .flight-line {
    padding: 16px 0 13px;
    width: 78%;
  }
  .together-foot {
    font-size: 10px;
  }
  .hero-postcard {
    padding: 10px 10px 0;
    transform: rotate(0.6deg);
  }
  .postcard-image {
    min-height: 0;
    aspect-ratio: 1.6;
  }
  .postcard-footer {
    padding: 15px 6px;
  }
  .postcard-footer strong {
    font-size: 12px;
  }
  .postcard-footer span {
    font-size: 10px;
  }
  .postcard-badge {
    font-size: 7px;
    top: 12px;
    left: 12px;
  }
  .tape-one {
    width: 58px;
    height: 20px;
    left: -10px;
  }
  .upcoming-strip {
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;
  }
  .strip-label {
    grid-column: 1/-1;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px dashed #dce1ce;
    background: #f0f1e6;
  }
  .strip-label > svg {
    width: 16px;
  }
  .strip-label > span {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 11px;
  }
  .strip-label > span > br {
    display: none;
  }
  .strip-label small {
    font-size: 7px;
  }
  .upcoming-item {
    border-left: 0;
    padding: 17px 15px;
    gap: 8px;
    min-width: 0;
  }
  .upcoming-item:nth-of-type(2) {
    border-left: 1px dashed #dfe2d1;
  }
  .upcoming-item strong {
    font-size: 11px;
  }
  .upcoming-item > span:first-child small {
    font-size: 9px;
  }
  .countdown-small b {
    font-size: 26px;
  }
  .strip-more {
    position: absolute;
    right: 8px;
    top: 6px;
    border: 0;
    height: 29px;
    padding: 0 8px;
  }
  .strip-more svg {
    width: 17px;
  }
  .home-content-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .section-heading {
    margin-bottom: 15px;
  }
  .section-heading h2 {
    font-size: 19px;
  }
  .section-heading > .text-button {
    font-size: 11px;
  }
  .empty-paper {
    min-height: 235px;
    padding: 24px;
  }
  .empty-album {
    min-height: 260px;
    padding: 24px;
  }
  .empty-paper h3 {
    font-size: 15px;
  }
  .empty-paper p {
    font-size: 12px;
  }
  .empty-album h3 {
    font-size: 14px;
  }
  .empty-album p {
    font-size: 12px;
  }
  .empty-album .button {
    font-size: 12px;
  }
  .end-note {
    font-size: 9px;
    gap: 2px;
  }
  .end-note span {
    width: 23px;
  }
  .section-heading > .small {
    font-size: 9px;
  }
}
@media (hover: none) {
  .upcoming-item:active {
    background: #f6f5ec;
  }
}
</style>
