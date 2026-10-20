<script setup lang="ts">
import { ref, watch } from "vue";
import { AlertTriangle } from "lucide-vue-next";
import { confirmBox, settleConfirm } from "../ui";

const dialog = ref<HTMLDialogElement>();
let previous: HTMLElement | null = null;
let overflow = "";

watch(
  () => confirmBox.open,
  (open) => {
    if (open) {
      previous = document.activeElement as HTMLElement | null;
      overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.value?.showModal();
    } else {
      document.body.style.overflow = overflow;
      previous?.focus();
      if (dialog.value?.open) dialog.value.close();
    }
  },
);

function finish(value: boolean) {
  settleConfirm(value);
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal confirm-modal"
    aria-label="请确认"
    @cancel.prevent="finish(false)"
    @click="
      (e) => {
        if (e.target === dialog) finish(false);
      }
    "
  >
    <div class="confirm-body">
      <span class="confirm-icon" :class="{ danger: confirmBox.danger }">
        <AlertTriangle :size="26" />
      </span>
      <p id="confirm-message" class="confirm-message">
        {{ confirmBox.message }}
      </p>
      <div class="confirm-actions">
        <button type="button" class="button secondary" @click="finish(false)">
          {{ confirmBox.cancelText }}
        </button>
        <button
          type="button"
          class="button"
          :class="confirmBox.danger ? 'danger-button' : 'primary'"
          @click="finish(true)"
        >
          {{ confirmBox.confirmText }}
        </button>
      </div>
    </div>
  </dialog>
</template>
