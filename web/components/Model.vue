<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { X } from "lucide-vue-next";
const props = defineProps<{
  title: string;
  wide?: boolean;
  busy?: boolean;
}>();
const emit = defineEmits<{
  close: [];
}>();
const dialog = ref<HTMLDialogElement>();
const previous = document.activeElement as HTMLElement | null;
const overflow = document.body.style.overflow;
function close() {
  if (!props.busy) emit("close");
}
onMounted(() => {
  dialog.value?.showModal();
  document.body.style.overflow = "hidden";
});
onUnmounted(() => {
  document.body.style.overflow = overflow;
  previous?.focus();
});
</script>

<template>
  <dialog
    ref="dialog"
    :class="['modal', { wide }]"
    aria-labelledby="model-title"
    @cancel.prevent="close"
    @click="
      (e) => {
        if (e.target === dialog) close();
      }
    "
  >
    <header class="modal-header">
      <div>
        <span class="eyebrow">OUR FLIGHT LOG</span>
        <div class="model-title-line">
          <h2 id="model-title">{{ title }}</h2>
          <slot name="title-suffix" />
        </div>
      </div>
      <button
        type="button"
        class="icon-button"
        aria-label="关闭弹窗"
        :disabled="busy"
        @click="close"
      >
        <X :size="20" />
      </button>
    </header>
    <div class="modal-body">
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
.modal.wide {
  width: min(760px, calc(100vw - 30px));
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 27px 20px;
  border-bottom: 1px solid #e2e5d6;
  position: sticky;
  top: 0;
  background: #fcfaf3f5;
  z-index: 3;

  .eyebrow {
    font-size: 8px;
    margin-bottom: 4px;
  }

  h2 {
    font-size: 22px;
  }
}
.model-title-line {
  display: flex;
  align-items: center;
  gap: 2px;

  h2 {
    margin: 0;
  }
}
.modal-body {
  padding: 25px 27px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-color: #c9d0bd transparent;
}
@media (max-width: 760px) {
  .modal.wide {
    width: calc(100vw - 24px);
  }
  .modal-header {
    padding: 19px 20px 16px;
  }
  .modal-header h2 {
    font-size: 20px;
  }
  .modal-body {
    padding: 20px;
  }
}
@media (max-width: 540px) {
  .modal-header {
    padding: 18px;
  }
  .modal-body {
    padding: 18px;
  }
}
</style>
