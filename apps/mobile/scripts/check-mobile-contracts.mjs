import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (relativePath) => readFileSync(resolve(root, relativePath), "utf8");
const checks = [
  ["strict video input parser exists", existsSync(resolve(root, "src/lib/mobile-utils.ts"))],
  ["video import uses strict parser", read("app/(tabs)/_layout.tsx").includes("parseVideoInput")],
  ["video details keeps original text when translation is unavailable", read("app/video/[videoId].tsx").includes("已保留英文原文") || read("src/lib/api.ts").includes("已保留英文原文")],
  ["moments errors reach the panel", read("app/video/[videoId].tsx").includes("momentsError")],
  ["summary errors reach the panel", read("app/video/[videoId].tsx").includes("summaryError")],
  ["TP dashboard has no synthetic check-in generator", !read("app/(tabs)/tp.tsx").includes("getMockCheckinHistory")],
  ["TP dashboard has no random metrics", !read("app/(tabs)/tp.tsx").includes("Math.random")],
  ["chat has no development mock fallback", !read("src/lib/api.ts").includes("本地模拟答复")],
  ["speech score is computed from recognition", read("app/tp-practice/[kind].tsx").includes("calculateSpeakingScore")],
  ["sentences screen has no blocking alert reset", !read("app/sentences.tsx").includes("Alert.alert(")],
  ["paragraphs screen has no blocking alert reset", !read("app/paragraphs.tsx").includes("Alert.alert(")],
  ["mobile cache policy keeps transcript for 30 days", read("src/lib/cache-policy.ts").includes("transcriptMs: 30 * 24 * 60 * 60 * 1000")],
  ["mobile cache policy keeps analysis for 7 days", read("src/lib/cache-policy.ts").includes("analysisMs: 7 * 24 * 60 * 60 * 1000")],
  ["cached translation JSON is consumed", read("src/lib/api.ts").includes("consumeCachedTranslationPayload")],
  ["startup does not force reparse cached videos", !read("app/(tabs)/_layout.tsx").includes("force: true")],
  ["mobile player has no subtitle fine-tuning dial", !read("src/components/video-player.tsx").includes("PanResponder") && !read("src/components/video-player.tsx").includes("JOG DIAL")],
  ["home avatar uses the TP logo", read("src/lib/user-profile.ts").includes("tp-logo.png")],
  ["learning panel hides translation progress row", !read("src/components/learning-panels.tsx").includes("translationStatus")],
  ["transcript rows hide pending translation copy", !read("src/components/transcript-list.tsx").includes("翻译中，先显示原文兜底")],
  ["video screen has no cinematic mode", !read("app/video/[videoId].tsx").match(/影院模式|cinematic|Film/)],
  ["translation stream surfaces batch failures", read("src/lib/api.ts").includes("failedBatchCount") && read("src/lib/api.ts").includes("translation_failed")],
  ["translation stream ignores source-text fallbacks", read("src/lib/api.ts").includes("text_zh.trim() !== source.text.trim()")],
  ["translation stream exposes resumable pages", read("src/lib/api.ts").includes("hasMore") && read("src/lib/api.ts").includes("interrupted = true")],
  ["mobile follows translation pages automatically", read("app/video/[videoId].tsx").includes("translateRemainingPages") && read("app/video/[videoId].tsx").includes("shouldContinueTranslation")],
  ["partial translation cache does not suppress resume", !read("app/video/[videoId].tsx").includes("translationCachedAt &&")],
  ["translation progress cache is persisted by the server", read("../../app/api/translate-transcript/route.ts").includes("persistProgress")],
  ["translation page stays below proxy timeout", read("../../app/api/translate-transcript/route.ts").includes("BATCH_SIZE = 10") && read("../../app/api/translate-transcript/route.ts").includes("MAX_BATCHES_PER_REQUEST = 1")],
  ["GLM provider preset is available", read("../../app/api/admin/settings/route.ts").includes("glm-5.3-flash")],
];

const failed = checks.filter(([, passed]) => !passed).map(([label]) => label);
if (failed.length > 0) {
  console.error(`Mobile contract checks failed (${failed.length}):`);
  for (const label of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log(`Mobile contract checks passed: ${checks.length}/${checks.length}`);
