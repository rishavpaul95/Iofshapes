# Iofshapes

A lightweight, mobile-first artist website for Iofshapes, by Haimanti Paul Nayak. Built with static HTML, TypeScript and Vite. All enquiries lead to Instagram messaging, with a public profile fallback; there is no contact form, booking backend, tracking or third-party embed.

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

Playwright covers desktop/mobile image loading, overflow from 320 to 1920 pixels, artwork selection, colour echoes, touch and keyboard gestures, image error recovery, the accessible artwork dialog, keyboard focus restoration, embroidery metadata, booking details, navigation, reduced motion, Instagram destinations, runtime errors and axe WCAG AA checks. A mobile-only test drives real touch input to confirm that taps mark the artwork, horizontal swipes change artwork in the gallery and the viewer, vertical swipes scroll the page instead, and no tap highlight or pointer cursor is applied. Pixel comparisons verify all three original photographs remain unchanged with maximum flow on desktop and mobile. Canvas checks verify nonblank pixels, touch/keyboard marks, replay, pause/resume, settling and offscreen suspension. The Instagram QR is decoded from screenshots of its rendered glass surround on desktop and mobile. A no-JavaScript check verifies the artist, work, enquiries and structured data remain available. Responsive and interaction screenshots are generated in `test-results`. Automated checks do not replace testing with assistive technologies or a physical phone.

## Living composition

The opening is an original interactive Canvas 2D composition inspired by the painting's flowers, eye, architectural bands and colour blocks. A red line develops into pattern. Visitors can add a red mark by touch, click or keyboard, compose a new variation, or pause the animation. This is visual identity, not a simulated image of the artist's hand or an additional portfolio work.

The user-supplied hand illustration serves as the desktop drawing cursor and a nonverbal tap cue. Its existing red markings and painted details are retained without additional drawing. The baked-in neutral checkerboard is removed, including from the gaps between fingers. A diagonal transparency fade softens the forearm to zero opacity before its cropped edges, without fading the fingers. The cue disappears after interaction, runs only two tap cycles and respects reduced motion and pause.

Rendering is capped at 30fps with device-pixel ratio capped at 2. Completed floral geometry is cached as Path2D objects, then the completed composition is cached as a bitmap for inexpensive movement. Caches rebuild on resize or a new variation. Marks are limited to twelve, and the animation frame loop stops outside the viewport and while the tab is hidden. Reduced motion gets a fully drawn still composition; controls remain usable. Native scrolling is never intercepted. No WebGL, video download, animation framework or new runtime dependency is needed.

The rendering-budget test measures steady-state animation under Chromium's 4x CPU throttling. It records frame rate and script time in a JSON test attachment. This is a local diagnostic, not a substitute for field Core Web Vitals or testing on physical low-end phones.

## Artwork studies and Instagram

The folio progressively enhances into an unframed artwork stage with a horizontal three-work index. The original photograph stays fully opaque, uncropped and unfiltered in both modes. Colour echoes samples the work's colours into flowing Canvas 2D contours outside its edges, with a clear gap around the photograph; the canvas sits behind the image and never replaces it. Mouse, touch and keyboard gestures shape those surrounding contours; Flow controls their reach. Each gesture settles into a quiet still contour in approximately 1.5 seconds. Original mode hides the echoes, and the full-screen dialog remains available. Without JavaScript, the three images remain visible with links to the originals. The second mehendi photograph is labelled as a detail from the same series, not a separate commission.

Contour rendering is capped at approximately 30fps and device-pixel ratio 2, with at most 648 sampled strokes; neutral samples are omitted. Its animation loop stops when settled, offscreen or in a hidden tab. Reduced motion gives an immediate still response to each gesture without automatic animation. Native touch scrolling remains available. These contours are an interface treatment, not additional portfolio images, and use no WebGL or new runtime dependency.

## Touch interaction

Touch input is handled separately from the mouse in `src/touch-gestures.ts`. A gesture becomes a tap only on release, after a short, stationary contact, so starting a scroll on the artwork or the opening composition never triggers a mark. Vertical movement, a second finger, a cancelled pointer or a window blur abandons the gesture. Horizontal swipes move between artworks in the gallery and the full-screen viewer; vertical scrolling and pinch zoom stay with the browser, and no handler blocks or emulates scrolling.

The synthesised click that follows a touch is suppressed, so a tap never activates the same control twice. Tap highlights are removed from the canvases, artwork surfaces and controls, and drag-selection is disabled there. The drawing-hand cursor, hover backgrounds and icon tooltips apply only to devices that report hover and a fine pointer; on phones the same actions remain available through visible controls, taps and the accessible names. Keyboard focus outlines are unchanged.

Embroidery appears in the page title, search/social descriptions, visible copy and the artist's structured-data expertise. No embroidery photograph has been supplied, so the site does not invent a portfolio example. The red-hand detail remains a separate note about the visual identity, not a claim about the origin of her art.

Profile and follow links open https://www.instagram.com/iofshapes/. Booking links open https://ig.me/m/iofshapes, with a profile fallback in the booking details. Instagram may require login or its app. A website or QR cannot automatically follow an account or send a message: visitors must confirm those actions themselves.

The supplied `scripts/insta-QR.jpg` is cropped to its QR and quiet zone, without altering its modules, and published as `public/images/instagram-qr.png`. Its glass surround uses the actual painting as a backdrop, with translucent edges and a pointer-responsive highlight. The code itself stays opaque, unblurred and undistorted. Reduced motion disables the moving highlight; reduced transparency and browsers without backdrop-filter get an opaque fallback. `npm run images` verifies its encoded Instagram destination using locally loaded ZXing. `npm run test:metadata` also decodes the generated QR at its 240px mobile display size. The decoder is a development dependency only; it is not shipped to browsers. If the source QR changes, review the crop and verification again.

## Artwork

- `public/images/CanvasArt.jpg`: original painting supplied by the user.
- `public/images/mehendi-leaves.jpg` and `mehendi-leaves-detail.jpg`: original images retrieved from the public carousel at https://www.instagram.com/iofshapes/p/CqBDcViJmKV/ at the user's request.
- Captions are descriptive editorial labels, not asserted official artwork titles.
- No stock portfolio artwork, fabricated artist photographs or invented client testimonials are used. The drawing-hand cursor is an interface motif only.
- `scripts/drawing-hand.jpg`: supplied hand illustration, retained unchanged. `npm run images` removes the neutral checkerboard using its colour difference from the warm hand, cleans edge contamination, and generates a self-contained `public/images/drawing-hand.svg`. This SVG embeds a transparent 224px PNG; it is not a vector trace. The SVG displays at 112x76, with a PNG cursor fallback and hotspot at (3, 3). If the source image changes, review the matte and hotspot again.
- `scripts/creation-of-adam.jpg`: earlier public-domain reference from [Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg>), no longer used by the image pipeline or deployed site.
- The original JPEGs are retained. `npm run images` generates smaller WebP variants with Sharp; rerun after replacing the source images. Keep artwork references in `index.html` and the viewer data in `src/main.ts` in sync.
- The images are served locally, not from expiring Instagram CDN links. Confirm the artist's publication permissions before launching.
- The SVG favicon uses the same red six-spoke Lucide asterisk as the header. `npm run images` also generates its 32px PNG fallback and 180px Apple touch icon.

## Publish

### GitHub Pages: iofshapes.in

The workflow in `.github/workflows/main.yml` builds for **https://iofshapes.in/** and publishes through the `rishavpaul95/Iofshapes` repository. It sets `SITE_URL`, generates images, checks deployment paths and SEO metadata, builds with Node.js 24, and publishes `dist`. No deployment token or secret is required. The custom domain must also be configured in GitHub and Hostinger; changing the workflow alone does not connect it.

#### Connect the domain

1. In **GitHub account Settings > Pages > Add a domain**, enter `iofshapes.in`. In **Hostinger > Domains > iofshapes.in > DNS / Nameservers**, add the TXT record GitHub provides. Use `_github-pages-challenge-rishavpaul95` as the Name (without the `.iofshapes.in` suffix) and GitHub's verification code as the Value. Return to GitHub and verify. Keep the TXT record afterward.
2. In **repository Settings > Pages**, select **GitHub Actions** as the source and save `iofshapes.in` under **Custom domain** before pointing the website DNS records to GitHub. This requires repository administrator access. A `CNAME` file is not required for this Actions workflow.
3. With Hostinger nameservers in use, configure the records below in Hostinger. Replace conflicting parking/website A, AAAA, ALIAS or CNAME records for `@` and `www`, but keep email and verification records. Leave nameservers unchanged; do not reset the DNS zone, add wildcard records or use domain forwarding. The default TTL is fine.

| Type  | Name  | Value                    |
| ----- | ----- | ------------------------ |
| A     | `@`   | `185.199.108.153`        |
| A     | `@`   | `185.199.109.153`        |
| A     | `@`   | `185.199.110.153`        |
| A     | `@`   | `185.199.111.153`        |
| CNAME | `www` | `rishavpaul95.github.io` |

4. Upload the updated workflow to `main` and let the deployment complete. Wait for GitHub's DNS check and certificate provisioning, then select **Enforce HTTPS**. DNS and certificate changes can take up to 24 hours.
5. Verify `https://iofshapes.in/`, the redirect from `https://www.iofshapes.in/`, and the HTTPS redirect from HTTP. Add the domain in Google Search Console and submit `https://iofshapes.in/sitemap.xml`.

#### Upload the project

1. Upload the project contents into the repository root, preserving the `src`, `public`, `scripts`, `tests` and `.github/workflows` folders. Include `package.json`, `package-lock.json`, `tsconfig.json` and `vite.config.ts`. Do not upload `node_modules`, `dist`, `test-results`, `playwright-report`, `.git` or private `.env` files; browser uploads do not apply your local `.gitignore` automatically.
2. Under **Settings > Pages > Build and deployment**, choose **GitHub Actions**. A repository administrator may need to enable this.
3. Upload the workflow last, or create it with **Add file > Create new file** using the path `.github/workflows/main.yml`. Commit to `main`. If the default branch has another name, update the workflow's branch filter.
4. Open **Actions > Deploy Iofshapes to GitHub Pages** and check the run. The workflow also supports **Run workflow**. Future browser uploads committed to `main` deploy automatically.
5. Open the URL above after deployment succeeds. Check the gallery viewer, cursor, favicon and images. The deployment has only been tested locally until a GitHub Actions run succeeds.

Browser uploads still require repository write access even though command-line Git is unnecessary. For an initial upload, include the complete project source, not just the workflow. When migrating an already deployed, up-to-date project, replace the workflow and upload the changed supporting files.

### Other deployment targets

1. Production builds default to the launched site, `https://iofshapes.in/`. To publish elsewhere, set `SITE_URL` to the final HTTPS site URL, optionally including a deployment path, in the hosting build environment or a local `.env` file. `.env.example` documents the key. Credentials, query strings, fragments and non-plain paths are rejected.
2. Run `npm run build` and deploy the contents of `dist` at that URL. The Vite base path is derived from `SITE_URL`, so HTML/CSS assets and gallery images use the same deployment path. With no override, the site builds for `/`. Local development also uses `/`. For a custom domain on Pages, also change the workflow's `SITE_URL` and configure the domain in GitHub Pages settings.
3. The build adds the canonical URL, absolute Open Graph image URL and `og:url`. The explicit source files `public/robots.txt` and `public/sitemap.xml` become `dist/robots.txt` and `dist/sitemap.xml` at the deployed root. Their URLs are rewritten when `SITE_URL` overrides the production domain. Do not put another copy beside the repository's `index.html`; Vite's `public` directory is the source for root-served static assets.
4. Check the live Instagram profile and messaging links on iOS and Android, both logged in and logged out. App availability and account settings can affect messaging links; the public profile remains available as a fallback. Test the QR with a physical phone camera.
5. Confirm service coverage and copy with Haimanti, review social previews, and submit the sitemap to Search Console.

On the custom domain, `robots.txt` is published at `https://iofshapes.in/robots.txt`, the root location crawlers use. If reverting to the default project URL, restore `SITE_URL=https://rishavpaul95.github.io/Iofshapes/` in the workflow and remove the repository custom domain only after safely updating DNS. The project-path robots file would not govern domain-root crawling; submit that deployment's sitemap directly to Search Console. Subpath support remains covered by regression tests.

The sitemap lists the single canonical page, `https://iofshapes.in/`. In-page anchors are not separate URLs, and no invented modification date or crawl priority is included. After redeployment, confirm that `/robots.txt` returns plain text and `/sitemap.xml` returns XML rather than an HTML fallback, then submit the sitemap in Google Search Console. These files help discovery; they do not guarantee indexing or ranking.

All text and JSON-LD are in the initial HTML for crawlers. Fonts are locally hosted. The opening uses one locally hosted SVG hand asset for its cursor and tap cue, with a PNG cursor fallback and no video or large hero image; original artwork below it uses responsive, lazy-loaded WebP images. The inspection stage lazy-loads its initial full-resolution artwork and loads subsequent originals when selected; the dialog reuses those URLs. The animation does not own or gate any SEO content.

## Editing

- Content, navigation, artwork and structured data: `index.html`
- Visual identity and responsive layouts: `src/style.css`
- Icons and interactions: `src/main.ts`
- Artwork controls and colour echoes: `src/artwork-study.ts`, `src/pigment-field.ts`
- Touch taps and swipes: `src/touch-gestures.ts`
- Living Canvas composition and rendering lifecycle: `src/living-line.ts`
- Deployment metadata: `vite.config.ts`, `public/robots.txt`, `public/sitemap.xml`
- Source formatting: `npm run format`

The mehendi portfolio photographs are not identified as showing Haimanti's congenital hand difference. The separately supplied hand photos inform the cursor illustration only; they are not published on the site.
