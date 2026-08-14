import assert from "node:assert/strict";
import test from "node:test";
import { getVideoPlayerFallbackTitle, shouldShowBilibiliImport, shouldShowTranscriptFallbackTitle } from "./workspace-state";

test("shows the Bilibili import flow for the explicit safe-import response", () => {
  assert.equal(shouldShowBilibiliImport("bilibili_subtitle_import_required", true), true);
});

test("does not replace unrelated transcript failures with the Bilibili import flow", () => {
  assert.equal(shouldShowBilibiliImport("network_error", true), false);
  assert.equal(shouldShowBilibiliImport("bilibili_subtitle_import_required", false), false);
});

test("does not show a metadata failure title when Bilibili needs subtitle import", () => {
  assert.equal(shouldShowTranscriptFallbackTitle(true, true), false);
  assert.equal(shouldShowTranscriptFallbackTitle(true, false), true);
  assert.equal(shouldShowTranscriptFallbackTitle(false, false), false);
});

test("uses a stable Bilibili label instead of a permanent loading title during import", () => {
  assert.equal(getVideoPlayerFallbackTitle(true, "BV1nJV36KEnV"), "B站视频 BV1nJV36KEnV");
  assert.equal(getVideoPlayerFallbackTitle(false, "BV1nJV36KEnV"), undefined);
  assert.equal(getVideoPlayerFallbackTitle(true), "视频信息加载失败");
});
