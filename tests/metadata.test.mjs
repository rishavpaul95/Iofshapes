import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "vite";

async function buildWithDomain(siteUrl) {
  const previousUrl = process.env.SITE_URL;
  process.env.SITE_URL = siteUrl;
  try {
    const bundle = await build({
      build: { write: false },
      logLevel: "silent",
      envDir: false,
    });
    assert.ok(!Array.isArray(bundle) && "output" in bundle);
    return bundle.output;
  } finally {
    if (previousUrl === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousUrl;
  }
}

test("a configured origin produces canonical, social and sitemap metadata", async () => {
  const output = await buildWithDomain("https://iofshapes.example");
  const html = output.find((asset) => asset.fileName === "index.html").source;
  const robots = output.find((asset) => asset.fileName === "robots.txt").source;
  const sitemap = output.find(
    (asset) => asset.fileName === "sitemap.xml",
  ).source;
  assert.match(html, /rel="canonical" href="https:\/\/iofshapes\.example\/"/);
  assert.match(
    html,
    /property="og:url" content="https:\/\/iofshapes\.example\/"/,
  );
  assert.match(
    html,
    /property="og:image" content="https:\/\/iofshapes\.example\/images\/CanvasArt\.jpg"/,
  );
  assert.match(robots, /Sitemap: https:\/\/iofshapes\.example\/sitemap.xml/);
  assert.match(sitemap, /<loc>https:\/\/iofshapes\.example\/<\/loc>/);
});

test("an unconfigured build never invents a production domain", async () => {
  const output = await buildWithDomain("");
  const html = output.find((asset) => asset.fileName === "index.html").source;
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.equal(
    output.some((asset) => asset.fileName === "sitemap.xml"),
    false,
  );
});

test("deployment rejects an unsafe or unsupported origin", async () => {
  for (const siteUrl of [
    "http://iofshapes.example",
    "https://iofshapes.example/subpath",
    "https://user:password@iofshapes.example",
  ]) {
    await assert.rejects(
      buildWithDomain(siteUrl),
      /SITE_URL must be an HTTPS origin/,
    );
  }
});
