import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowBilibiliImport, shouldShowTranscriptFallbackTitle } from "./workspace-state";

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
