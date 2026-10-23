import { reactive, ref } from "vue"
import { today } from "./store"
import type { Entry } from "../shared/types"

export const editorOpen = ref(false);
export const editorEntry = ref<Entry | null>(null);
export const editorDate = ref("");
export const viewerId = ref<string | null>(null);
// 预览时左右切换的范围：为 null 表示全部媒体
export const viewerScope = ref<string[] | null>(null);
export function openViewer(id: string, scope: string[] | null = null) {
  viewerScope.value = scope && scope.length ? [...scope] : null;
  viewerId.value = id;
}
export function writeEntry(date = today.value, entry: Entry | null = null) {
  editorEntry.value = entry;
  editorDate.value = entry?.date || date;
  editorOpen.value = true;
}

export interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const confirmBox = reactive({
  open: false,
  message: "",
  confirmText: "确定",
  cancelText: "取消",
  danger: false,
  resolve: null as ((value: boolean) => void) | null,
});

export function confirmDialog(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  confirmBox.message = message;
  confirmBox.confirmText = options.confirmText ?? "确定";
  confirmBox.cancelText = options.cancelText ?? "取消";
  confirmBox.danger = options.danger ?? false;
  confirmBox.open = true;
  return new Promise<boolean>((resolve) => {
    confirmBox.resolve = resolve;
  });
}

export function settleConfirm(value: boolean) {
  confirmBox.open = false;
  confirmBox.resolve?.(value);
  confirmBox.resolve = null;
}