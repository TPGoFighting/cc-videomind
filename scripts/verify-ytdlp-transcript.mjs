import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const VIDEO_ID = "kJjgr0So7ek";
const watchUrl = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

function run(cmd, args) {
  return new Promise((res, rej) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, timeout: 90000 }, (err, stdout, stderr) => {
      if (err) return rej(new Error(stderr?.toString?.() || err.message));
      res({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

const outDir = await fs.mkdtemp(path.join(tmpdir(), "tp-verify-"));
const args = [
  watchUrl, "--skip-download", "--write-auto-subs", "--write-subs",
  "--sub-lang", "en", "--sub-format", "json3", "--no-warnings", "--no-progress",
  "--no-playlist", "-o", path.join(outDir, "%(id)s.%(ext)s"),
  "--cookies-from-browser", "chrome",
];

try {
  await run("python3", ["-m", "yt_dlp", ...args]);
} catch (e) {
  console.error("yt-dlp FAILED:", e.message);
  await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
}

const files = await fs.readdir(outDir);
const sub = files.find((f) => f.endsWith(".json3"));
if (!sub) {
  console.error("no json3 file; dir contents:", files);
  await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
}

const raw = await fs.readFile(path.join(outDir, sub), "utf-8");
const data = JSON.parse(raw);
const events = data.events || [];
const segs = events
  .map((e) => ({
    start: (e.tStartMs || 0) / 1000,
    dur: (e.dDurationMs || 0) / 1000,
    text: (e.segs || []).map((s) => s.utf8).join(" "),
  }))
  .filter((s) => s.text.trim());

console.log("subtitle file:", sub);
console.log("total segments:", segs.length);
console.log("duration(s):", segs.length ? (segs[segs.length - 1].start + segs[segs.length - 1].dur).toFixed(1) : 0);
console.log("--- first 5 segments ---");
for (const s of segs.slice(0, 5)) {
  console.log(`[${s.start.toFixed(1)}s] ${s.text}`);
}

await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
