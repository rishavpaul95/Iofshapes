import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "SITE_");
  const configuredUrl = process.env.SITE_URL || environment.SITE_URL;
  let siteUrl = "";
  let base = "/";

  if (configuredUrl) {
    const parsedUrl = new URL(configuredUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username ||
      parsedUrl.password ||
      !/^(?:\/[A-Za-z0-9._~-]+)*\/?$/.test(parsedUrl.pathname) ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      throw new Error(
        "SITE_URL must be an HTTPS URL with a plain deployment path and no credentials, query or fragment.",
      );
    }
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/?$/, "/");
    siteUrl = parsedUrl.href;
    base = parsedUrl.pathname;
  }

  return {
    base,
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
