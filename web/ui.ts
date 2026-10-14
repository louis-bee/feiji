import { ref } from "vue"
import { today } from "./store"
import type { Entry } from "../shared/types"

export const editorOpen = ref(false);
export const editorEntry = ref<Entry | null>(null);
export const editorDate = ref("");
export const viewerId = ref<string | null>(null);
export function writeEntry(date = today.value, entry: Entry | null = null) {
  editorEntry.value = entry;
  editorDate.value = entry?.date || date;
  editorOpen.value = true;
}