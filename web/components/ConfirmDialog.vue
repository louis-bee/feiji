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

<style scoped>
.confirm-modal {
  width: min(440px, calc(100vw - 30px));
}
.confirm-body {
  padding: 36px 34px 30px;
  text-align: center;
}
.confirm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #f4ede0;
  color: #b98a2f;
  margin-bottom: 12px;
}
.confirm-icon.danger {
  background: #f7e6e2;
  color: var(--danger);
}
.confirm-icon svg {
  transform: translateY(-1.3px);
}
.confirm-message {
  font-size: 15px;
  line-height: 1.9;
  color: var(--ink);
  margin: 0;
  white-space: pre-line;
}
.confirm-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}
.confirm-actions .button {
  flex: 1;
  min-width: 0;
  min-height: 46px;
  padding: 12px 16px;
  font-size: 14px;
  border-radius: 11px;
}
</style>
