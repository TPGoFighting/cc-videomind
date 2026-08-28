import { isBilibiliVideoId } from "@teach-player/shared";

export interface SearchResult {
  id: string; // YouTube videoId or Bilibili bvid
  title: string;
  author: string;
  thumbnail: string;
  duration?: string;
  platform: "youtube" | "bilibili";
}

/**
 * 搜索 YouTube 视频 (需配置 EXPO_PUBLIC_YOUTUBE_API_KEY)
 */
export async function searchYouTube(query: string, maxResults = 10): Promise<SearchResult[]> {
  const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("YouTube API Key is missing");
    return [];
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

    const data = await res.json();
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      platform: "youtube",
    }));
  } catch (error) {
    console.error("YouTube search failed:", error);
    return [];
  }
}

/**
 * 搜索 Bilibili 视频 (调用公共网页接口，无需鉴权)
 */
export async function searchBilibili(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}`;
    // Bilibili API usually requires a realistic User-Agent and sometimes Referer to bypass basic blocks
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://search.bilibili.com/",
      }
    });

    if (!res.ok) throw new Error(`Bilibili API error: ${res.status}`);

    const data = await res.json();
    if (data.code !== 0 || !data.data?.result) {
      return [];
    }

    return data.data.result.map((item: any) => {
      // B站标题带高亮标签 <em class="keyword">，需要剥离
      const title = item.title.replace(/<[^>]+>/g, '');
      return {
        id: item.bvid,
        title: title,
        author: item.author,
        // B站封面 URL 通常以 // 开头
        thumbnail: item.pic.startsWith('//') ? `https:${item.pic}` : item.pic,
        duration: item.duration,
        platform: "bilibili",
      };
    });
  } catch (error) {
    console.error("Bilibili search failed:", error);
    return [];
  }
}

/**
 * 并行搜索双平台
 */
export async function searchVideos(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  // 如果输入的是直链或 BVID，直接构造单个结果返回
  const trimmed = query.trim();
  if (isBilibiliVideoId(trimmed)) {
    return [{
      id: trimmed,
      title: `解析 Bilibili 视频: ${trimmed}`,
      author: "未知 UP 主",
      thumbnail: "https://i0.hdslb.com/bfs/archive/47f781db16f6b5b5ec1e21b026ccfb2293b6e828.png", // fallback bg
      platform: "bilibili",
    }];
  }

  if (trimmed.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return [{
      id: trimmed,
      title: `解析 YouTube 视频: ${trimmed}`,
      author: "未知频道",
      thumbnail: `https://i.ytimg.com/vi/${trimmed}/hqdefault.jpg`,
      platform: "youtube",
    }];
  }

  // 正常搜索
  const [ytResults, biliResults] = await Promise.all([
    searchYouTube(query),
    searchBilibili(query)
  ]);

  // 交替混合结果，增加多样性
  const combined: SearchResult[] = [];
  const maxLen = Math.max(ytResults.length, biliResults.length);
  for (let i = 0; i < maxLen; i++) {
    if (biliResults[i]) combined.push(biliResults[i]);
    if (ytResults[i]) combined.push(ytResults[i]);
  }

  return combined;
}
