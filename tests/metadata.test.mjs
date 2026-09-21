import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "vite";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

test("the supplied Instagram QR remains scannable at its mobile display size", async () => {
  prepareZXingModule({
    overrides: {
      wasmBinary: new Uint8Array(
        await readFile("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"),
      ).buffer,
    },
  });
  const image = await sharp("public/images/instagram-qr.png")
    .resize(240, 240)
    .png()
    .toBuffer();
  const codes = await readBarcodes(image, {
    formats: ["QRCode"],
    tryHarder: true,
  });
  assert.equal(codes.length, 1);
  const destination = new URL(codes[0].text);
  assert.equal(destination.origin, "https://www.instagram.com");
  assert.equal(destination.pathname.replace(/\/$/, ""), "/iofshapes");
});

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

test("the custom domain produces root asset paths and production SEO metadata", async () => {
  const output = await buildWithDomain("https://iofshapes.in/");
  const html = output.find((asset) => asset.fileName === "index.html").source;
  const robots = output.find((asset) => asset.fileName === "robots.txt").source;
  const sitemap = output.find(
    (asset) => asset.fileName === "sitemap.xml",
  ).source;
  const css = output
    .filter((asset) => asset.fileName.endsWith(".css"))
    .map((asset) => asset.source)
    .join("\n");
  const script = output
    .filter((asset) => asset.type === "chunk")
    .map((asset) => asset.code)
    .join("\n");
  assert.match(html, /rel="canonical" href="https:\/\/iofshapes\.in\/"/);
  assert.match(html, /property="og:url" content="https:\/\/iofshapes\.in\/"/);
  assert.match(
    html,
    /property="og:image" content="https:\/\/iofshapes\.in\/images\/CanvasArt\.jpg"/,
  );
  assert.match(robots, /Sitemap: https:\/\/iofshapes\.in\/sitemap.xml/);
  assert.match(sitemap, /<loc>https:\/\/iofshapes\.in\/<\/loc>/);
  assert.equal(robots, await readFile("public/robots.txt", "utf8"));
  assert.equal(sitemap, await readFile("public/sitemap.xml", "utf8"));
  assert.equal((sitemap.match(/<loc>/g) || []).length, 1);
  assert.doesNotMatch(sitemap, /#|<lastmod>/);
  assert.match(html, /src="\/images\/instagram-qr\.png"/);
  assert.match(html, /href="\/favicon\.svg/);
  assert.match(html, /src="\/assets\//);
  assert.match(css, /\/images\/drawing-hand\.svg/);
  for (const filename of [
    "CanvasArt.jpg",
    "mehendi-leaves.jpg",
    "mehendi-leaves-detail.jpg",
  ]) {
    assert.ok(script.includes(`/images/${filename}`));
    assert.ok(html.includes(`href="/images/${filename}"`));
  }
  assert.doesNotMatch(
    [html, css, script, robots, sitemap].join("\n"),
    /\/Iofshapes\/|rishavpaul95\.github\.io/,
  );
});

test("a default production build uses the launched domain and public discovery files", async () => {
  const output = await buildWithDomain("");
  const html = output.find((asset) => asset.fileName === "index.html").source;
  assert.match(html, /rel="canonical" href="https:\/\/iofshapes\.in\/"/);
  for (const fileName of ["robots.txt", "sitemap.xml"]) {
    assert.equal(
      output.find((asset) => asset.fileName === fileName).source,
      await readFile(`public/${fileName}`, "utf8"),
    );
  }
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
    assert.match(html, /src="\/Iofshapes\/images\/instagram-qr\.png"/);
    assert.match(html, /href="\/Iofshapes\/favicon\.svg/);
    assert.match(html, /src="\/Iofshapes\/assets\//);
    assert.match(css, /\/Iofshapes\/images\/drawing-hand\.svg/);
    for (const filename of [
      "CanvasArt.jpg",
      "mehendi-leaves.jpg",
      "mehendi-leaves-detail.jpg",
    ]) {
      assert.ok(script.includes(`/Iofshapes/images/${filename}`));
      assert.ok(html.includes(`href="/Iofshapes/images/${filename}"`));
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
