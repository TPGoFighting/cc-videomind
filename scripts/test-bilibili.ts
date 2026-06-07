import { BilibiliTranscriptProvider } from "../lib/bilibili/transcript-provider";
import { fetchBilibiliMetadata } from "../lib/bilibili/metadata";
import { resolveBilibiliUrl, extractBilibiliVideoId } from "../lib/bilibili/id";
import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let value = trimmed.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        value = value.replace(/\\n/g, "").trim();
        process.env[key] = value;
      }
    }
  }
} catch (err) {
  console.warn("无法手动加载 .env.local:", err);
}

async function main() {
  console.log("=== B站视频解析与 ASR 语音识别测试 ===");

  console.log("ASR_API_BASE_URL:", process.env.ASR_API_BASE_URL);
  console.log("ASR_API_KEY:", process.env.ASR_API_KEY ? "已配置 (sk-***)" : "未配置");
  console.log("ASR_MODEL:", process.env.ASR_MODEL);

  const testShortUrl = "https://b23.tv/sqqGnFt";
  console.log(`\n1. 测试短链接解析: ${testShortUrl}`);
  const resolvedUrl = await resolveBilibiliUrl(testShortUrl);
  console.log("解析后的真实链接:", resolvedUrl);
  
  const bvid = extractBilibiliVideoId(resolvedUrl);
  console.log("提取出的 BV 号:", bvid);

  if (!bvid) {
    console.error("未能提取出 BV 号，测试终止");
    return;
  }

  console.log(`\n2. 测试元数据抓取: ${bvid}`);
  const metadata = await fetchBilibiliMetadata(bvid);
  console.log("视频元数据:", {
    videoId: metadata.videoId,
    title: metadata.title,
    authorName: metadata.authorName,
    thumbnailUrl: metadata.thumbnailUrl,
    cid: metadata.cid
  });

  console.log(`\n3. 测试字幕/语音转写 (ASR)...`);
  try {
    const provider = new BilibiliTranscriptProvider();
    const segments = await provider.getTranscript(bvid);
    console.log(`转写成功！共获取到 ${segments.length} 条字幕片段。`);
    console.log("前5条字幕预览:");
    console.log(segments.slice(0, 5));
  } catch (error) {
    console.error("转写/字幕获取失败:", error);
  }
}

main().catch(console.error);
