import assert from "node:assert/strict";
import test from "node:test";
import { runSingleFlight } from "@/lib/utils/single-flight";

test("coalesces concurrent work for the same video", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const first = runSingleFlight("analysis:shared-video", async () => {
    calls++;
    await gate;
    return "cached-result";
  });
  const second = runSingleFlight("analysis:shared-video", async () => {
    calls++;
    return "duplicate-result";
  });

  release();
  assert.deepEqual(await Promise.all([first, second]), ["cached-result", "cached-result"]);
  assert.equal(calls, 1);
});

test("releases a failed key so a later request can retry", async () => {
  await assert.rejects(
    runSingleFlight("analysis:retry-video", async () => {
      throw new Error("upstream unavailable");
    }),
  );

  const result = await runSingleFlight("analysis:retry-video", async () => "recovered");
  assert.equal(result, "recovered");
});
