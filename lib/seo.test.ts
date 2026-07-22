import assert from "node:assert/strict";
import { describe, it } from "node:test";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { createPageMetadata, SITE_URL } from "@/lib/seo";

describe("SEO contract", () => {
  it("uses the canonical production domain for public pages", () => {
    const metadata = createPageMetadata({
      title: "精选英语学习视频",
      description: "description",
      path: "/explore",
      index: true,
    });

    assert.equal(metadata.alternates?.canonical, "/explore");
    assert.equal(metadata.openGraph && "url" in metadata.openGraph ? metadata.openGraph.url : null, `${SITE_URL}/explore`);
    assert.deepEqual(
      metadata.openGraph && "images" in metadata.openGraph ? metadata.openGraph.images : null,
      [
        {
          url: `${SITE_URL}/share-image`,
          width: 1200,
          height: 630,
          alt: "Teach Player 双语视频学习工作区",
        },
      ],
    );
    assert.deepEqual(metadata.robots, {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    });
  });

  it("keeps account and generated workspace pages out of the index by default", () => {
    const metadata = createPageMetadata({
      title: "账户设置",
      description: "description",
      path: "/settings",
    });

    assert.deepEqual(metadata.robots, {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    });
  });

  it("publishes only intentional public pages in sitemap and robots", () => {
    assert.deepEqual(
      sitemap().map((entry) => entry.url),
      [SITE_URL, `${SITE_URL}/explore`, `${SITE_URL}/privacy`, `${SITE_URL}/terms`, `${SITE_URL}/support`],
    );

    const rules = robots().rules;
    assert.ok(!Array.isArray(rules));
    assert.deepEqual(rules.allow, ["/", "/explore", "/privacy", "/terms", "/support"]);
    assert.ok(rules.disallow?.includes("/api/"));
    assert.ok(rules.disallow?.includes("/video/"));
  });
});
