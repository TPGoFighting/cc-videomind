import { notFound } from "next/navigation";
import { VideoWorkspace } from "@/components/video-workspace";
import {
  parseWorkspaceFixture,
  parseWorkspaceFixtureSaveMode,
} from "@/lib/video/workspace-fixture";
import { VideoIdSchema } from "@/lib/youtube/id";
import { BilibiliImportedVideoIdSchema, BilibiliVideoIdSchema } from "@/lib/bilibili/id";
import { parseVideoStartTime } from "@/lib/product/retention";

export default async function VideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{
    fixture?: string | string[];
    fixtureSave?: string | string[];
    t?: string | string[];
  }>;
}) {
  const { videoId } = await params;
  const query = await searchParams;
  const parsed = VideoIdSchema.safeParse(videoId);
  const bilibiliParsed = BilibiliVideoIdSchema.safeParse(videoId);
  const importedBilibiliParsed = BilibiliImportedVideoIdSchema.safeParse(videoId);
  if (!parsed.success && !bilibiliParsed.success && !importedBilibiliParsed.success) {
    notFound();
  }
  const workspaceVideoId = parsed.success
    ? parsed.data
    : bilibiliParsed.success
      ? bilibiliParsed.data
      : videoId;

  const fixtureState = process.env.NODE_ENV === "production"
    ? undefined
    : parseWorkspaceFixture(query.fixture);
  const fixtureSaveMode = fixtureState
    ? parseWorkspaceFixtureSaveMode(query.fixtureSave) ?? "preview"
    : undefined;
  const initialStartTime = parseVideoStartTime(query.t);

  return (
    <VideoWorkspace
      key={`${workspaceVideoId}:${fixtureState ?? "live"}:${fixtureSaveMode ?? "persist"}`}
      videoId={workspaceVideoId}
      platform={bilibiliParsed.success || importedBilibiliParsed.success ? "bilibili" : "youtube"}
      fixtureState={fixtureState}
      fixtureSaveMode={fixtureSaveMode}
      initialStartTime={initialStartTime}
    />
  );
}
