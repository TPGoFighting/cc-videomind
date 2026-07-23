import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BilibiliImportedVideoIdSchema,
  buildBilibiliEmbedUrl,
  extractBilibiliVideoId,
  isBilibiliVideoId,
} from "@/lib/bilibili/id";

const BVID = "BV1xx411c7mD";

describe("Bilibili video identity contract", () => {
  it("accepts direct IDs and canonical public video URLs", () => {
    assert.equal(extractBilibiliVideoId(BVID), BVID);
    assert.equal(extractBilibiliVideoId(`https://www.bilibili.com/video/${BVID}/`), BVID);
    assert.equal(extractBilibiliVideoId(`https://bilibili.com/video/${BVID}?share_source=copy_web`), BVID);
    assert.equal(extractBilibiliVideoId(`https://b23.tv/${BVID}`), BVID);
    assert.equal(isBilibiliVideoId(BVID), true);
  });

  it("does not claim an opaque short link is already a resolved video", () => {
    assert.equal(extractBilibiliVideoId("https://b23.tv/abCDefG"), null);
    assert.equal(extractBilibiliVideoId("https://example.com/video/BV1xx411c7mD"), null);
  });

  it("keeps imported subtitle workspaces distinct from public Bilibili IDs", () => {
    const importedId = "bili_550e8400-e29b-41d4-a716-446655440000";
    assert.equal(BilibiliImportedVideoIdSchema.safeParse(importedId).success, true);
    assert.equal(isBilibiliVideoId(importedId), false);
  });

  it("builds an embed URL only from a validated Bilibili video ID", () => {
    assert.equal(
      buildBilibiliEmbedUrl(BVID, 72),
      `https://player.bilibili.com/player.html?bvid=${BVID}&high_quality=1&danmaku=0&t=72`,
    );
  });
});
