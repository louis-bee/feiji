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
        <h2 id="model-title">{{ title }}</h2>
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
