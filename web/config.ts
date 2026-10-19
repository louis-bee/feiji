import { ref } from "vue";

export const SESSION_KEY = "our-flight-entry";
const FALLBACK_ENTRY_PASSWORD = "0611";

export const entryPassword = ref(FALLBACK_ENTRY_PASSWORD);

let pending: Promise<void> | null = null;
/** 读取 public/config.json；构建后直接改该文件即可换口令，无需重新构建。 */
export function loadConfig(): Promise<void> {
  if (pending) return pending;
  pending = fetch(`${import.meta.env.BASE_URL}config.json`, {
    cache: "no-store",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { entryPassword?: unknown } | null) => {
      const value = data?.entryPassword;
      if (typeof value === "string" && value) entryPassword.value = value;
    })
    .catch(() => {})
    .finally(() => {
      pending = null;
    });
  return pending;
}
