import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WORKSPACE_FIXTURE,
  parseWorkspaceFixture,
  parseWorkspaceFixtureSaveMode,
} from "./workspace-fixture";
import {
  KeyMomentSchema,
  SummaryTakeawaySchema,
  TranscriptSegmentSchema,
  VideoAnalysisSchema,
  VideoMetadataSchema,
} from "../types";

describe("video workspace fixture", () => {
  it("accepts only the named visual states", () => {
    assert.equal(parseWorkspaceFixture("ready"), "ready");
    assert.equal(parseWorkspaceFixture("partial"), "partial");
    assert.equal(parseWorkspaceFixture("production-data"), undefined);
    assert.equal(parseWorkspaceFixture(["ready"]), undefined);
  });

  it("limits save-flow simulation to named development modes", () => {
    assert.equal(parseWorkspaceFixtureSaveMode("preview"), "preview");
    assert.equal(parseWorkspaceFixtureSaveMode("guest"), "guest");
    assert.equal(parseWorkspaceFixtureSaveMode("authenticated"), undefined);
    assert.equal(parseWorkspaceFixtureSaveMode(["guest"]), undefined);
  });

  it("stays compatible with the production workspace schemas", () => {
    assert.equal(VideoMetadataSchema.safeParse(WORKSPACE_FIXTURE.metadata).success, true);
    assert.equal(TranscriptSegmentSchema.array().safeParse(WORKSPACE_FIXTURE.transcript).success, true);
    assert.equal(VideoAnalysisSchema.safeParse(WORKSPACE_FIXTURE.analysis).success, true);
    assert.equal(KeyMomentSchema.array().safeParse(WORKSPACE_FIXTURE.moments).success, true);
    assert.equal(SummaryTakeawaySchema.array().safeParse(WORKSPACE_FIXTURE.takeaways).success, true);
  });
});
