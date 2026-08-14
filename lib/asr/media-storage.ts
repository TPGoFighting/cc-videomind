import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const mediaExtensions = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
} as const;

const supportedExtensions = new Set(Object.values(mediaExtensions));

export const MediaStorageKeySchema = z
  .string()
  .regex(/^asr\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp4|webm|mp3|m4a|wav)$/i, "Invalid media storage key.");

export function mediaExtensionFor(contentType: string): string | null {
  return mediaExtensions[contentType.toLowerCase().trim() as keyof typeof mediaExtensions] ?? null;
}

export function createMediaStorageKey(extension: string): string {
  if (!supportedExtensions.has(extension as (typeof mediaExtensions)[keyof typeof mediaExtensions])) {
    throw new Error("Unsupported media extension.");
  }
  return `asr/${randomUUID()}.${extension}`;
}

function uploadsRoot(): string {
  return path.join(process.cwd(), "uploads");
}

function resolveMediaPath(storageKey: string): string {
  const parsed = MediaStorageKeySchema.parse(storageKey);
  return path.join(uploadsRoot(), parsed);
}

export async function writeTransientMedia(storageKey: string, content: Uint8Array): Promise<void> {
  const filePath = resolveMediaPath(storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, { flag: "wx" });
}

export async function readTransientMedia(storageKey: string): Promise<Buffer> {
  return readFile(resolveMediaPath(storageKey));
}

export async function deleteTransientMedia(storageKey: string): Promise<void> {
  await rm(resolveMediaPath(storageKey), { force: true });
}
