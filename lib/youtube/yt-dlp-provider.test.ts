import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildYtDlpArgs } from "./yt-dlp-provider";

describe("buildYtDlpArgs", () => {
  it("pins the Android YouTube client for subtitle extraction", () => {
    const args = buildYtDlpArgs({
      videoId: "v4F1gFy-hqg",
      outDir: "/tmp/tp-ytdlp-test",
      lang: "en",
      proxy: "http://127.0.0.1:7890",
      cookiesFile: "/tmp/youtube-cookies.txt",
    });

    const extractorArgsIndex = args.indexOf("--extractor-args");
    assert.notStrictEqual(extractorArgsIndex, -1);
    assert.strictEqual(args[extractorArgsIndex + 1], "youtube:player_client=android");
    assert.strictEqual(args[args.indexOf("--proxy") + 1], "http://127.0.0.1:7890");
    assert.strictEqual(args[args.indexOf("--cookies") + 1], "/tmp/youtube-cookies.txt");
    assert.strictEqual(args.at(-1), "https://www.youtube.com/watch?v=v4F1gFy-hqg");
  });

  it("does not pass a fake loopback proxy when no proxy is configured", () => {
    const args = buildYtDlpArgs({
      videoId: "v4F1gFy-hqg",
      outDir: "/tmp/tp-ytdlp-test",
      lang: "en",
    });

    assert.strictEqual(args.includes("--proxy"), false);
  });
});
