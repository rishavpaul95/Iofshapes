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

test("GitHub Pages subpaths prefix assets, gallery images and SEO metadata", async () => {
  for (const suffix of ["", "/"]) {
    const output = await buildWithDomain(
      `https://rishavpaul95.github.io/Iofshapes${suffix}`,
    );
    const html = output.find((asset) => asset.fileName === "index.html").source;
    const css = output
      .filter((asset) => asset.fileName.endsWith(".css"))
      .map((asset) => asset.source)
      .join("\n");
    const script = output
      .filter((asset) => asset.type === "chunk")
      .map((asset) => asset.code)
      .join("\n");
    const robots = output.find(
      (asset) => asset.fileName === "robots.txt",
    ).source;
    const sitemap = output.find(
      (asset) => asset.fileName === "sitemap.xml",
    ).source;
    assert.match(
      html,
      /rel="canonical" href="https:\/\/rishavpaul95\.github\.io\/Iofshapes\/"/,
    );
    assert.match(
      html,
      /property="og:url" content="https:\/\/rishavpaul95\.github\.io\/Iofshapes\/"/,
    );
    assert.match(
      html,
      /property="og:image" content="https:\/\/rishavpaul95\.github\.io\/Iofshapes\/images\/CanvasArt\.jpg"/,
    );
    assert.match(html, /src="\/Iofshapes\/images\/CanvasArt-720\.webp"/);
    assert.match(html, /href="\/Iofshapes\/favicon\.svg/);
    assert.match(html, /src="\/Iofshapes\/assets\//);
    assert.match(css, /\/Iofshapes\/images\/drawing-hand\.svg/);
    for (const filename of [
      "CanvasArt.jpg",
      "mehendi-leaves.jpg",
      "mehendi-leaves-detail.jpg",
    ]) {
      assert.ok(script.includes(`/Iofshapes/images/${filename}`));
    }
    assert.doesNotMatch(
      html,
      /(?:src|href)="\/(?:images|assets|favicon|apple-touch-icon)/,
    );
    assert.doesNotMatch(css, /url\(["']?\/images\//);
    assert.match(
      robots,
      /Sitemap: https:\/\/rishavpaul95\.github\.io\/Iofshapes\/sitemap.xml/,
    );
    assert.match(
      sitemap,
      /<loc>https:\/\/rishavpaul95\.github\.io\/Iofshapes\/<\/loc>/,
    );
  }
});

test("deployment rejects unsafe URLs", async () => {
  for (const siteUrl of [
    "http://iofshapes.example",
    "https://user:password@iofshapes.example",
    "https://iofshapes.example/?query=value",
    "https://iofshapes.example/#fragment",
    "https://iofshapes.example/unsafe&path/",
  ]) {
    await assert.rejects(
      buildWithDomain(siteUrl),
      /SITE_URL must be an HTTPS URL/,
    );
  }
});
