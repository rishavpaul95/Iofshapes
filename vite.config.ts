import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const productionUrl = "https://iofshapes.in/";
  const environment = loadEnv(mode, process.cwd(), "SITE_");
  const configuredUrl =
    process.env.SITE_URL ||
    environment.SITE_URL ||
    (command === "build" ? productionUrl : "");
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
          for (const fileName of ["robots.txt", "sitemap.xml"]) {
            const source = readFileSync(
              new URL(`./public/${fileName}`, import.meta.url),
              "utf8",
            );
            this.emitFile({
              type: "asset",
              fileName,
              source: source.replaceAll(
                productionUrl,
                siteUrl || productionUrl,
              ),
            });
          }
        },
      },
    ],
  };
});
