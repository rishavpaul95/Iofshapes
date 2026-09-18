# Iofshapes

A lightweight, mobile-first artist website for Iofshapes, by Haimanti Paul Nayak. Built with static HTML, TypeScript and Vite. All enquiries lead to the supplied Instagram profile; there is no contact form, booking backend, tracking or third-party embed.

## Run locally

Requires Node.js 22.12+ (Node.js 24 recommended).

```sh
npm install
npm run dev
```

On Windows with restricted PowerShell execution policies, use `npm.cmd` in place of `npm`.

## Validate

```sh
npm run build
npx playwright install chromium
npm test
npm run test:metadata
```

Playwright covers desktop/mobile image loading, overflow from 320 to 1920 pixels, non-repeated artwork, the accessible artwork dialog, keyboard focus restoration, booking details, navigation, reduced motion, Instagram destinations, runtime errors and axe WCAG AA checks. Canvas checks verify nonblank pixels, touch/keyboard marks, replay, pause/resume and offscreen suspension. A no-JavaScript check verifies the artist, work, enquiries and structured data remain available. Responsive screenshots are generated in `test-results`. Automated checks do not replace testing with assistive technologies or a physical phone.

## Living composition

The opening is an original interactive Canvas 2D composition inspired by the painting's flowers, eye, architectural bands and colour blocks. A red line develops into pattern. Visitors can add a red mark by touch, click or keyboard, compose a new variation, or pause the animation. This is visual identity, not a simulated image of the artist's hand or an additional portfolio work.

The user-supplied hand illustration serves as the desktop drawing cursor and a nonverbal tap cue. Its existing red markings and painted details are retained without additional drawing. The baked-in neutral checkerboard is removed, including from the gaps between fingers. A diagonal transparency fade softens the forearm to zero opacity before its cropped edges, without fading the fingers. The cue disappears after interaction, runs only two tap cycles and respects reduced motion and pause.

Rendering is capped at 30fps with device-pixel ratio capped at 2. Completed floral geometry is cached as Path2D objects, then the completed composition is cached as a bitmap for inexpensive movement. Caches rebuild on resize or a new variation. Marks are limited to twelve, and the animation frame loop stops outside the viewport and while the tab is hidden. Reduced motion gets a fully drawn still composition; controls remain usable. Native scrolling is never intercepted. No WebGL, video download, animation framework or new runtime dependency is needed.

The rendering-budget test measures steady-state animation under Chromium's 4x CPU throttling. It records frame rate and script time in a JSON test attachment. This is a local diagnostic, not a substitute for field Core Web Vitals or testing on physical low-end phones.

The folio presents all three original images once each in a compact three-column desktop spread. On phones, the painting sits above two paired botanical photographs. The second mehendi photograph is labelled as a detail from the same series, not a separate commission. All three images open in the artwork viewer. The artist passage describes her practice; the red-hand detail appears separately as a short note about the visual identity, not a claim about the origin of her art.

## Artwork

- `public/images/CanvasArt.jpg`: original painting supplied by the user.
- `public/images/mehendi-leaves.jpg` and `mehendi-leaves-detail.jpg`: original images retrieved from the public carousel at https://www.instagram.com/____tiny_apocalypse/p/CqBDcViJmKV/ at the user's request.
- Captions are descriptive editorial labels, not asserted official artwork titles.
- No stock portfolio artwork, fabricated artist photographs or invented client testimonials are used. The drawing-hand cursor is an interface motif only.
- `scripts/drawing-hand.jpg`: supplied hand illustration, retained unchanged. `npm run images` removes the neutral checkerboard using its colour difference from the warm hand, cleans edge contamination, and generates a self-contained `public/images/drawing-hand.svg`. This SVG embeds a transparent 224px PNG; it is not a vector trace. The SVG displays at 112x76, with a PNG cursor fallback and hotspot at (3, 3). If the source image changes, review the matte and hotspot again.
- `scripts/creation-of-adam.jpg`: earlier public-domain reference from [Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg>), no longer used by the image pipeline or deployed site.
- The original JPEGs are retained. `npm run images` generates smaller WebP variants with Sharp; rerun after replacing the source images. Keep artwork references in `index.html` and the viewer data in `src/main.ts` in sync.
- The images are served locally, not from expiring Instagram CDN links. Confirm the artist's publication permissions before launching.
- The SVG favicon uses the same red six-spoke Lucide asterisk as the header. `npm run images` also generates its 32px PNG fallback and 180px Apple touch icon.

## Publish

### GitHub Pages: rishavpaul95/Iofshapes

The workflow in `.github/workflows/deploy.yml` deploys to **https://rishavpaul95.github.io/Iofshapes/**. It sets `SITE_URL`, generates images, checks deployment paths and SEO metadata, builds with Node.js 24, and publishes `dist`. No deployment token or secret is required.

1. Upload the project contents into the repository root, preserving the `src`, `public`, `scripts`, `tests` and `.github/workflows` folders. Include `package.json`, `package-lock.json`, `tsconfig.json` and `vite.config.ts`. Do not upload `node_modules`, `dist`, `test-results`, `playwright-report`, `.git` or private `.env` files; browser uploads do not apply your local `.gitignore` automatically.
2. Under **Settings > Pages > Build and deployment**, choose **GitHub Actions**. A repository administrator may need to enable this.
3. Upload the workflow last, or create it with **Add file > Create new file** using the path `.github/workflows/deploy.yml`. Commit to `main`. If the default branch has another name, update the workflow's branch filter.
4. Open **Actions > Deploy Iofshapes to GitHub Pages** and check the run. The workflow also supports **Run workflow**. Future browser uploads committed to `main` deploy automatically.
5. Open the URL above after deployment succeeds. Check the gallery viewer, cursor, favicon and images. The deployment has only been tested locally until a GitHub Actions run succeeds.

Browser uploads still require repository write access even though command-line Git is unnecessary. Do not upload only the workflow: the subpath support in `vite.config.ts` and `src/main.ts`, and the matching `tests/metadata.test.mjs`, are also required.

### Other hosts or a custom domain

1. Set `SITE_URL` to the final HTTPS site URL, optionally including a deployment path, in the hosting build environment or a local `.env` file. `.env.example` documents the key. Credentials, query strings, fragments and non-plain paths are rejected. No domain is invented by default.
2. Run `npm run build` and deploy `dist` at that URL. The Vite base path is derived from `SITE_URL`, so HTML/CSS assets and gallery images use the same deployment path. With no `SITE_URL`, the site builds for `/`. For a custom domain on Pages, also change the workflow's `SITE_URL` and configure the domain in GitHub Pages settings.
3. When `SITE_URL` is set, the build adds the canonical URL, absolute Open Graph image URL, `og:url` and a sitemap. `robots.txt` is always generated.
4. Check the live Instagram link on iOS and Android. Instagram may ask visitors to sign in; enquiry buttons deliberately use the supplied public profile rather than an unreliable direct-message deep link.
5. Confirm service coverage and copy with Haimanti, review social previews, and submit the sitemap to Search Console.

On project Pages, `robots.txt` is published under `/Iofshapes/`, not the domain root where crawlers look for it. Submit `https://rishavpaul95.github.io/Iofshapes/sitemap.xml` directly to Search Console; controlling the root `robots.txt` requires the account site or a custom domain.

All text and JSON-LD are in the initial HTML for crawlers. Fonts are locally hosted. The opening uses one locally hosted SVG hand asset for its cursor and tap cue, with a PNG cursor fallback and no video or large hero image; original artwork below it uses responsive, lazy-loaded WebP images. Full-resolution images are loaded into the viewer only when opened. The animation does not own or gate any SEO content.

## Editing

- Content, navigation, artwork and structured data: `index.html`
- Visual identity and responsive layouts: `src/style.css`
- Icons and interactions: `src/main.ts`
- Living Canvas composition and rendering lifecycle: `src/living-line.ts`
- Deployment metadata: `vite.config.ts`
- Source formatting: `npm run format`

The mehendi portfolio photographs are not identified as showing Haimanti's congenital hand difference. The separately supplied hand photos inform the cursor illustration only; they are not published on the site.
