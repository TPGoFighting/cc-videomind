import assert from "node:assert/strict";
import test from "node:test";
import { getNextTabIndex, isTabNavigationKey } from "./tabs";

test("moves horizontally through tabs and wraps at each end", () => {
  assert.equal(getNextTabIndex(1, "ArrowRight", 4), 2);
  assert.equal(getNextTabIndex(3, "ArrowRight", 4), 0);
  assert.equal(getNextTabIndex(0, "ArrowLeft", 4), 3);
});

test("moves directly to the first or last tab", () => {
  assert.equal(getNextTabIndex(2, "Home", 4), 0);
  assert.equal(getNextTabIndex(1, "End", 4), 3);
});

test("leaves unrelated keys and empty tab sets unchanged", () => {
  assert.equal(getNextTabIndex(2, "Enter", 4), 2);
  assert.equal(getNextTabIndex(0, "ArrowRight", 0), 0);
  assert.equal(isTabNavigationKey("ArrowLeft"), true);
  assert.equal(isTabNavigationKey("Enter"), false);
});
