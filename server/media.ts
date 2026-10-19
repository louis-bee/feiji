import { unlink } from "node:fs/promises";
import { join } from "node:path";
import type { Media } from "../shared/types";
import type { StoredMedia } from "./database";

export function mediaDto(media: StoredMedia): Media {
  const { originalFile, viewFile, thumbFile, ...result } = media;
  return result;
}

export async function removeFiles(
  dir: string,
  files: Iterable<string>,
  onError?: (error: unknown, file: string) => void,
) {
  await Promise.all(
    [...new Set(files)].map(async (file) => {
      try {
        await unlink(join(dir, file));
      } catch (error) {
        onError?.(error, file);
      }
    }),
  );
}
