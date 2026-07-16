import path from "node:path";
import type { ApiEnv } from "@falcon/config";

export type MediaStorageMode = "persistent" | "ephemeral" | "local";

export function mediaStorageMode(env: Pick<ApiEnv, "MEDIA_DIR" | "NODE_ENV">): MediaStorageMode {
  if (env.NODE_ENV !== "production") return "local";
  const mountValue = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (!mountValue) return "ephemeral";
  const mediaDir = path.resolve(env.MEDIA_DIR);
  const mountDir = path.resolve(mountValue);
  const storedOnVolume = mediaDir === mountDir || mediaDir.startsWith(`${mountDir}${path.sep}`);
  return storedOnVolume ? "persistent" : "ephemeral";
}
