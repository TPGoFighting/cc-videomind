import { z } from "zod";
import { BilibiliVideoIdSchema } from "@/lib/bilibili/id";
import { MediaStorageKeySchema } from "@/lib/asr/media-storage";

export const AuthorizedMediaAsrTaskInputSchema = z.object({
  storageKey: MediaStorageKeySchema,
  contentType: z.enum(["video/mp4", "video/webm", "audio/mpeg", "audio/mp4", "audio/webm", "audio/wav", "audio/x-wav"]),
  duration: z.number().finite().min(1).max(2 * 60 * 60),
  title: z.string().trim().min(1).max(200),
  sourceVideoId: BilibiliVideoIdSchema,
});

export type AuthorizedMediaAsrTaskInput = z.infer<typeof AuthorizedMediaAsrTaskInputSchema>;
