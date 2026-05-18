import { notFound } from "next/navigation";
import { VideoWorkspace } from "@/components/video-workspace";
import { VideoIdSchema } from "@/lib/youtube/id";

export default async function VideoPage({
  params
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const parsed = VideoIdSchema.safeParse(videoId);
  if (!parsed.success) {
    notFound();
  }

  return <VideoWorkspace videoId={parsed.data} />;
}
