import { notFound } from "next/navigation";
import { VideoWorkspace } from "@/components/video-workspace";
import {
  parseWorkspaceFixture,
  parseWorkspaceFixtureSaveMode,
} from "@/lib/video/workspace-fixture";
import { VideoIdSchema } from "@/lib/youtube/id";
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
  if (!parsed.success) {
    notFound();
  }

  const fixtureState = process.env.NODE_ENV === "production"
    ? undefined
    : parseWorkspaceFixture(query.fixture);
  const fixtureSaveMode = fixtureState
    ? parseWorkspaceFixtureSaveMode(query.fixtureSave) ?? "preview"
    : undefined;
  const initialStartTime = parseVideoStartTime(query.t);

  return (
    <VideoWorkspace
      key={`${parsed.data}:${fixtureState ?? "live"}:${fixtureSaveMode ?? "persist"}`}
      videoId={parsed.data}
      fixtureState={fixtureState}
      fixtureSaveMode={fixtureSaveMode}
      initialStartTime={initialStartTime}
    />
  );
}
