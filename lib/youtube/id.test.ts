import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractYouTubeVideoId, VideoIdSchema } from "@/lib/youtube/id";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("YouTube video ID contract", () => {
  it("accepts direct IDs and supported public URL shapes", () => {
    assert.equal(extractYouTubeVideoId(VIDEO_ID), VIDEO_ID);
    assert.equal(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}`), VIDEO_ID);
    assert.equal(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}`), VIDEO_ID);
    assert.equal(extractYouTubeVideoId(`https://youtube.com/shorts/${VIDEO_ID}`), VIDEO_ID);
    assert.equal(extractYouTubeVideoId(`https://youtube.com/embed/${VIDEO_ID}`), VIDEO_ID);
  });

  it("rejects unsupported hosts and malformed IDs", () => {
    assert.equal(extractYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(extractYouTubeVideoId("https://youtube.com/watch?v=short"), null);
    assert.equal(extractYouTubeVideoId("not a video"), null);
    assert.equal(VideoIdSchema.safeParse("../../secret").success, false);
  });
});
