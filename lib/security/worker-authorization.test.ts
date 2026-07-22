import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasWorkerAuthorization } from "./worker-authorization";

describe("internal worker authorization", () => {
  it("requires an exact bearer secret and fails closed when unconfigured", () => {
    const matching = new Request("https://video.tpgofighting.top/api/worker", {
      headers: { authorization: "Bearer expected-secret" },
    });
    const different = new Request("https://video.tpgofighting.top/api/worker", {
      headers: { authorization: "Bearer different-secret" },
    });
    assert.equal(hasWorkerAuthorization(matching, "expected-secret"), true);
    assert.equal(hasWorkerAuthorization(different, "expected-secret"), false);
    assert.equal(hasWorkerAuthorization(matching, undefined), false);
    assert.equal(hasWorkerAuthorization(new Request(matching.url), "expected-secret"), false);
  });
});
