import type { Metadata } from "next";

export const SITE_NAME = "Teach Player";
export const SITE_URL = "https://video.tpgofighting.top";
export const SITE_DESCRIPTION =
  "把知识型 YouTube 视频变成可核验、可收藏、可复习的双语学习材料。";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  index?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  index = false,
}: PageMetadataOptions): Metadata {
  const url = new URL(path, SITE_URL).toString();

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: {
      index,
      follow: index,
      googleBot: { index, follow: index },
    },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [
        {
          url: `${SITE_URL}/share-image`,
          width: 1200,
          height: 630,
          alt: "Teach Player 双语视频学习工作区",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/share-image`],
    },
  };
}
