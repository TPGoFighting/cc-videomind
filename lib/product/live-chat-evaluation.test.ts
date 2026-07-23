import assert from "node:assert/strict";
import { test } from "node:test";
import { allowsLiveChatEvaluation } from "@/lib/product/live-chat-evaluation";

test("live chat evaluation requires an explicit network opt-in", () => {
  assert.equal(allowsLiveChatEvaluation([]), false);
  assert.equal(allowsLiveChatEvaluation(["--dry-run"]), false);
  assert.equal(allowsLiveChatEvaluation(["--allow-network"]), true);
});
