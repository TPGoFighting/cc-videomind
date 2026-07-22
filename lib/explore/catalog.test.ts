import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEARNING_CATALOG } from "@/lib/explore/catalog";
import { VideoIdSchema } from "@/lib/youtube/id";

describe("public learning catalog", () => {
  it("contains only unique, reviewable videos with complete learning metadata", () => {
    assert.ok(LEARNING_CATALOG.length > 0);
    assert.equal(new Set(LEARNING_CATALOG.map((video) => video.videoId)).size, LEARNING_CATALOG.length);

    for (const video of LEARNING_CATALOG) {
      assert.ok(VideoIdSchema.safeParse(video.videoId).success);
      assert.match(video.duration, /^\d{1,2}:\d{2}$/);
      assert.equal(video.language, "英语");
      assert.equal(video.captions, "英文字幕");
      assert.ok(video.outcome.length >= 20);
      assert.equal(video.sourceUrl, `https://www.youtube.com/watch?v=${video.videoId}`);
      assert.match(video.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
