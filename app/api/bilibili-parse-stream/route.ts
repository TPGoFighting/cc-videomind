import { NextRequest } from "next/server";
import { resolveBilibiliUrl, extractBilibiliVideoId } from "@/lib/bilibili/id";
import { BilibiliTranscriptProvider } from "@/lib/bilibili/transcript-provider";
import { withSecurity } from "@/lib/security/middleware";
import { upsertTranscriptCache } from "@/lib/supabase/cache";
import { VideoDifficultyAnalyzer } from "@/lib/bilibili/difficulty-analyzer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withSecurity({
    allowedMethods: ["GET"],
    maxBodySize: 64 * 1024,
    scope: "bili-parse-stream",
    rateLimit: { maxRequests: 12, windowMs: 60_000 },
  }).wrap(request, async () => {
      const { searchParams } = new URL(request.url);
  const rawVideoId = searchParams.get("videoId");

  if (!rawVideoId) {
    return new Response("Missing videoId parameter", { status: 400 });
  }

  const encoder = new TextEncoder();

  // 创建 ReadableStream 以支持标准的 SSE 长连接流
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        console.log(`[Bili:SSE] 开始还原链接或提取 ID: ${rawVideoId}`);
        
        // 2. 还原短链重定向
        const resolvedUrl = await resolveBilibiliUrl(rawVideoId);
        
        // 3. 提取标准视频 ID
        const bvid = extractBilibiliVideoId(resolvedUrl);
        if (!bvid) {
          throw new Error("无法从输入内容中识别有效的 B站 视频 ID（BV号或av号）");
        }

        console.log(`[Bili:SSE] 成功匹配 BVID/AID = ${bvid}，启动双层转录提取...`);
        const provider = new BilibiliTranscriptProvider();

        let latestMetadata: any = null;
        let finalTranscript: any[] = [];

        // 4. 调用 Provider 执行流式拉取
        const transcript = await provider.getTranscript(bvid, "zh-CN", (event, data) => {
          if (event === "metadata") {
            latestMetadata = data;
          }
          if (event === "soft_subtitle" || event === "asr_chunk") {
            finalTranscript = data;

            // ⚠️ 只要获取到字幕 (不管是直接拉取软字幕还是硬 ASR complete)，立刻进行难度雷达曲线分析并推送
            try {
              if (latestMetadata && Array.isArray(data) && data.length > 0) {
                const diffResult = VideoDifficultyAnalyzer.analyze(data, latestMetadata.duration);
                sendEvent("difficulty", diffResult);
              }
            } catch (analErr) {
              console.error("[Bili:SSE] 视频词汇难度雷达分析失败:", analErr);
            }
          }
          // 将每一阶段性进度推送到客户端
          sendEvent(event, data);
        });

        // 5. 写入 supabase 缓存以供后续普通的 HTTP 接口直出
        if (latestMetadata && transcript.length > 0) {
          try {
            await upsertTranscriptCache({
              videoId: bvid,
              metadata: {
                videoId: bvid,
                title: latestMetadata.title,
                authorName: latestMetadata.authorName,
                thumbnailUrl: latestMetadata.thumbnailUrl,
                providerUrl: latestMetadata.providerUrl
              },
              transcript
            });
            console.log(`[Bili:SSE] 成功写入数据库缓存 bvid=${bvid}`);
          } catch (dbErr) {
            console.error(`[Bili:SSE] 写入数据库缓存失败:`, dbErr);
          }
        }

        // 发送完成信号
        sendEvent("complete", { videoId: bvid, transcript: finalTranscript.length > 0 ? finalTranscript : transcript });
        controller.close();
      } catch (error: any) {
        console.error(`[Bili:SSE] 提取解析流程中断:`, error);
        sendEvent("error", { message: error.message ?? "解析 B站 视频时发生异常故障" });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
});
}
