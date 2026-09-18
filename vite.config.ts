import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "SITE_");
  const configuredUrl = process.env.SITE_URL || environment.SITE_URL;
  let siteUrl = "";

  if (configuredUrl) {
    const parsedUrl = new URL(configuredUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.pathname !== "/" ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      throw new Error(
        "SITE_URL must be an HTTPS origin without a path, credentials, query or fragment.",
      );
    }
    siteUrl = parsedUrl.origin + "/";
  }

  return {
    plugins: [
      {
        name: "iofshapes-search-metadata",
        transformIndexHtml() {
          const tags = [
            {
              tag: "meta",
              attrs: {
                property: "og:image",
                content: `${siteUrl || "/"}images/CanvasArt.jpg`,
              },
              injectTo: "head" as const,
            },
          ];
          if (siteUrl) {
            tags.push({
              tag: "meta",
              attrs: { property: "og:url", content: siteUrl },
              injectTo: "head",
            });
            return [
              ...tags,
              {
                tag: "link",
                attrs: { rel: "canonical", href: siteUrl },
                injectTo: "head" as const,
              },
            ];
          }
          return tags;
        },
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "robots.txt",
            source: `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}sitemap.xml\n` : ""}`,
          });
          if (siteUrl) {
            this.emitFile({
              type: "asset",
              fileName: "sitemap.xml",
              source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}</loc></url></urlset>\n`,
            });
          }
        },
      },
    ],
  };
});
