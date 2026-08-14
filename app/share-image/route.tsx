import { ImageResponse } from "next/og";
import { ShareImage } from "@/components/brand/share-image";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<ShareImage />, {
    width: 1200,
    height: 630,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
