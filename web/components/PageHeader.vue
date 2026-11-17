<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow: string;
    title: string;
    description?: string;
  }>(),
  { description: "" },
);
</script>

<template>
  <section class="page-intro">
    <div>
      <span class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <slot />
  </section>
</template>

<style scoped>
/* 页面标题区：首页/日历/相册/纪念日/设置共用，样式收在组件内 */
.page-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 30px;
}
.page-intro .eyebrow {
  margin-bottom: 10px;
}
.page-intro p {
  color: #65715f;
  font-size: 13px;
  margin-top: 8px;
  line-height: 1.8;
}
/* 右侧操作按钮由父级通过 slot 传入，需用 :slotted 命中 */
:slotted(.button) {
  flex-shrink: 0;
}

@media (max-width: 1000px) {
  .page-intro {
    align-items: flex-start;
  }
  .page-intro h1 {
    font-size: 26px;
  }
  :slotted(.button) {
    font-size: 12px;
    padding: 10px 13px;
  }
}

@media (max-width: 760px) {
  .page-intro {
    margin-bottom: 24px;
    gap: 10px;
    align-items: center;
  }
  .page-intro h1 {
    font-size: 23px;
    letter-spacing: 0;
  }
  .page-intro p {
    font-size: 11px;
    line-height: 1.9;
    margin-top: 6px;
  }
  .page-intro .eyebrow {
    font-size: 8px;
    margin-bottom: 8px;
    letter-spacing: 0.14em;
  }
  :slotted(.button) {
    font-size: 11px;
    padding: 10px 12px;
    min-height: 44px;
    gap: 6px;
  }
  :slotted(.button) svg {
    width: 15px;
  }
}

@media (max-width: 540px) {
  .page-intro {
    align-items: flex-start;
  }
  .page-intro h1 {
    font-size: 22px;
  }
  :slotted(.button) {
    font-size: 10px;
    padding: 9px 11px;
    margin-top: 22px;
  }
  .page-intro p {
    max-width: 270px;
    font-size: 11px;
  }
}
</style>
