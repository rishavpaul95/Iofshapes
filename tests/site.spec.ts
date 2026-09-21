import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
});

test("brand, original artwork and Instagram-only enquiries", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("IOFSHAPES");
  await expect(page.locator(".attribution")).toHaveText(
    "by Haimanti Paul Nayak",
  );
  await expect(page.locator("form")).toHaveCount(0);
  const enquiryLinks = page.getByRole("link").filter({
    hasText: /Book mehendi|Let's talk mehendi|Let's make something/,
  });
  expect(await enquiryLinks.count()).toBeGreaterThanOrEqual(3);
  for (const link of await enquiryLinks.all()) {
    await expect(link).toHaveAttribute("href", "https://ig.me/m/iofshapes");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            (element as HTMLImageElement).complete &&
            (element as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBeTruthy();
  }
});

test("artwork index selects each original in the living gallery", async ({
  page,
}) => {
  await expect(page.locator(".folio-grid img")).toHaveCount(3);
  await expect(page.locator(".work-item")).toHaveCount(3);
  const images = await page
    .locator(".folio-grid img")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("src")),
    );
  expect(new Set(images).size).toBe(images.length);
  await expect(page.locator(".origin img")).toHaveCount(0);
  await expect(page.locator(".invitation img")).toHaveCount(0);
  for (let index = 0; index < 3; index++) {
    const selector = page.locator(`[data-artwork="${index}"]`);
    await selector.click();
    await expect(selector).toHaveAttribute("aria-current", "true");
    await expect(page.locator(".study-viewport")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator("#study-title")).toHaveText(
      await page.locator(".work-item h3").nth(index).innerText(),
    );
    await expect(page.locator(".study-image")).toHaveAttribute(
      "src",
      (await selector.getAttribute("href"))!,
    );
    expect(
      await page
        .locator(".study-image")
        .evaluate((element) => element.naturalWidth),
    ).toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: "Open artwork viewer" }).click();
  await expect(page.locator("#art-dialog-title")).toHaveText(
    "A little closer to nature",
  );
});

test("artwork pigment responds to touch, keyboard and flow without altering originals", async ({
  page,
  isMobile,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const viewport = page.getByRole("group", { name: "Living artwork" });
  const canvas = page.locator(".pigment-canvas");
  await viewport.scrollIntoViewIfNeeded();
  await expect(viewport).toHaveAttribute("data-loaded", "true");
  await expect(canvas).toHaveCSS("opacity", "1");
  const pixels = () => canvas.evaluate((element) => element.toDataURL());
  const original = await pixels();
  expect(
    await canvas.evaluate((element) => {
      const bytes = element
        .getContext("2d")!
        .getImageData(0, 0, element.width, element.height).data;
      let colored = 0;
      for (let offset = 3; offset < bytes.length; offset += 4)
        if (bytes[offset]) colored++;
      return colored / (element.width * element.height);
    }),
  ).toBeGreaterThan(0.0002);
  await page.getByRole("slider", { name: "Flow" }).fill("80");
  await expect(page.locator("#study-amount")).toHaveText("80%");
  expect(await pixels()).not.toBe(original);
  const beforeGesture = await pixels();
  if (isMobile) await viewport.tap({ position: { x: 85, y: 160 } });
  else await viewport.click({ position: { x: 85, y: 160 } });
  expect(await pixels()).not.toBe(beforeGesture);
  await viewport.focus();
  const beforeKeyboard = await pixels();
  await page.keyboard.press("ArrowDown");
  expect(await pixels()).not.toBe(beforeKeyboard);
  await viewport.screenshot({
    path: testInfo.outputPath("living-pigment.png"),
    scale: "css",
  });
  await page.getByRole("button", { name: "Reset artwork view" }).click();
  await expect(viewport).toHaveAttribute("data-mode", "original");
  await expect(page.locator(".study-image")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("slider", { name: "Flow" })).toBeDisabled();
  await page.getByRole("button", { name: "Stir pigment" }).click();
  await expect(viewport).toHaveAttribute("data-mode", "pigment");
  await viewport.focus();
  await page.keyboard.press("Escape");
  await expect(viewport).toHaveAttribute("data-mode", "original");
});

test("artwork touch gestures separate taps, swipes and native scrolling", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch-only interactions");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const viewport = page.locator(".study-viewport");
  const canvas = page.locator(".pigment-canvas");
  const session = await page.context().newCDPSession(page);
  async function swipe(selector: string, horizontal: number, vertical: number) {
    const surface = page.locator(selector);
    await surface.scrollIntoViewIfNeeded();
    const bounds = (await surface.boundingBox())!;
    const start = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    const steps = 8;
    let timestamp = Date.now() / 1000;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1 }],
      timestamp,
    });
    for (let step = 1; step <= steps; step++) {
      timestamp += 0.016;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + (horizontal * step) / steps,
            y: start.y + (vertical * step) / steps,
            id: 1,
          },
        ],
        timestamp,
      });
    }
    // A still finger before release ends the gesture without a fling that would swallow the next tap.
    for (let hold = 0; hold < 3; hold++) {
      timestamp += 0.05;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: start.x + horizontal, y: start.y + vertical, id: 1 },
        ],
        timestamp,
      });
    }
    timestamp += 0.05;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
      timestamp,
    });
  }
  await viewport.scrollIntoViewIfNeeded();
  await viewport.tap({ position: { x: 90, y: 160 } });
  await expect(canvas).toHaveAttribute("data-gesture", "1.00");
  await expect(viewport).toHaveCSS(
    "-webkit-tap-highlight-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(viewport).toHaveCSS("outline-style", "none");
  await expect(viewport).toHaveCSS("cursor", "auto");
  await swipe(".study-viewport", -110, 0);
  await expect(page.locator("#study-title")).toHaveText(
    "Leaves, in another form",
  );
  await expect(viewport).toHaveAttribute("data-loaded", "true");
  await expect(canvas).toHaveAttribute("data-gesture", "0.00");
  await swipe(".study-viewport", 110, 0);
  await expect(page.locator("#study-title")).toHaveText("Geometric faces");
  await expect(viewport).toHaveAttribute("data-loaded", "true");
  await page.getByRole("button", { name: "Open artwork viewer" }).tap();
  await expect(page.locator(".art-dialog")).toBeVisible();
  await swipe("#dialog-image", -110, 0);
  await expect(page.locator("#art-dialog-title")).toHaveText(
    "Leaves, in another form",
  );
  await swipe("#dialog-image", 110, 0);
  await expect(page.locator("#art-dialog-title")).toHaveText("Geometric faces");
  await page.locator(".close-dialog").tap();
  await viewport.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => scrollY);
  await swipe(".study-viewport", 0, -150);
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(scrollBefore + 30);
  await expect(page.locator("#study-title")).toHaveText("Geometric faces");
  await expect(canvas).toHaveAttribute("data-gesture", "0.00");
  await session.detach();
});

test("artwork stays pixel-identical at maximum pigment flow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (let index = 0; index < 3; index++) {
    await page.locator(`[data-artwork="${index}"]`).click();
    const viewport = page.locator(".study-viewport");
    await viewport.scrollIntoViewIfNeeded();
    await expect(viewport).toHaveAttribute("data-loaded", "true");
    await page.getByRole("button", { name: "Original", exact: true }).click();
    const image = page.locator(".study-image");
    const clip = await image.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const scale = Math.min(
        bounds.width / element.naturalWidth,
        bounds.height / element.naturalHeight,
      );
      const width = element.naturalWidth * scale;
      const height = element.naturalHeight * scale;
      return {
        x: bounds.x + scrollX + (bounds.width - width) / 2 + 1,
        y: bounds.y + scrollY + (bounds.height - height) / 2 + 1,
        width: width - 2,
        height: height - 2,
      };
    });
    const original = await page.screenshot({
      clip,
      fullPage: true,
      scale: "css",
    });
    await page
      .getByRole("button", { name: "Colour echoes" })
      .dispatchEvent("click");
    await page
      .getByRole("slider", { name: "Flow" })
      .evaluate((element: HTMLInputElement) => {
        element.value = "100";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      });
    await expect(page.locator(".pigment-canvas")).toHaveCSS("opacity", "1");
    await expect(image).toHaveCSS("opacity", "1");
    await expect(image).toHaveCSS("filter", "none");
    expect(
      (await page.screenshot({ clip, fullPage: true, scale: "css" })).equals(
        original,
      ),
      `Artwork ${index + 1} must remain pixel-identical`,
    ).toBe(true);
  }
});

test("artwork pigment animation settles and suspends offscreen", async ({
  page,
}) => {
  const canvas = page.locator(".pigment-canvas");
  await page.getByRole("button", { name: "Stir pigment" }).click();
  await expect(canvas).toHaveAttribute("data-gesture", "0.00", {
    timeout: 5000,
  });
  const settled = await canvas.getAttribute("data-frame");
  await page.evaluate(async () => {
    for (let frame = 0; frame < 12; frame++)
      await new Promise(requestAnimationFrame);
  });
  await expect(canvas).toHaveAttribute("data-frame", settled!);
  await page.getByRole("button", { name: "Stir pigment" }).click();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    for (let frame = 0; frame < 12; frame++)
      await new Promise(requestAnimationFrame);
  });
  const offscreen = await canvas.getAttribute("data-frame");
  await page.evaluate(async () => {
    for (let frame = 0; frame < 12; frame++)
      await new Promise(requestAnimationFrame);
  });
  await expect(canvas).toHaveAttribute("data-frame", offscreen!);
});

test("glass Instagram QR remains scannable as rendered", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const qr = page.locator(".instagram-qr");
  await qr.scrollIntoViewIfNeeded();
  await expect(qr.locator("img")).toHaveJSProperty("naturalWidth", 660);
  prepareZXingModule({
    overrides: {
      wasmBinary: new Uint8Array(
        await readFile("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"),
      ).buffer,
    },
  });
  const codes = await readBarcodes(
    await qr.screenshot({
      path: testInfo.outputPath("glass-qr.png"),
      scale: "css",
    }),
    { formats: ["QRCode"], tryHarder: true },
  );
  expect(codes).toHaveLength(1);
  expect(new URL(codes[0].text).pathname.replace(/\/$/, "")).toBe("/iofshapes");
  await expect(qr).toHaveCSS("backdrop-filter", /blur/);
});

test("embroidery metadata and Instagram follow QR remain discoverable", async ({
  page,
}) => {
  await expect(page).toHaveTitle(/Embroidery in Kolkata/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Haimanti Paul Nayak.*embroidery.*mehendi in Kolkata/i,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /embroidery/i,
  );
  await expect(page.locator(".origin-copy")).toContainText("embroidery");
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(
    schema["@graph"].find(
      (entry: { "@type": string }) => entry["@type"] === "Person",
    ).knowsAbout,
  ).toContain("Hand embroidery");
  await expect(
    page.getByRole("link", { name: /Follow @iofshapes/ }),
  ).toHaveAttribute("href", "https://www.instagram.com/iofshapes/");
  await expect(page.locator(".instagram-qr")).toHaveAttribute(
    "href",
    "https://www.instagram.com/iofshapes/",
  );
  await page.locator(".instagram-qr").scrollIntoViewIfNeeded();
  await expect(page.locator(".instagram-qr img")).toHaveJSProperty(
    "naturalWidth",
    660,
  );
});

test("inspection image failure is announced and another selection recovers", async ({
  page,
}) => {
  await page.route("**/images/mehendi-leaves-detail.jpg", (route) =>
    route.abort(),
  );
  await page.locator('[data-artwork="2"]').click();
  await expect(page.locator("#study-status")).toBeVisible();
  await expect(page.locator("#study-status")).toContainText("could not load");
  await page.locator('[data-artwork="0"]').click();
  await expect(page.locator(".study-viewport")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator("#study-status")).toHaveClass(/sr-only/);
});

test("drawing hand gives a nonverbal cue and retires after interaction", async ({
  page,
  isMobile,
}, testInfo) => {
  const canvas = page.locator("#living-line");
  const cue = page.locator(".drawing-cue");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.mouse.move(0, 0);
  await expect(cue).toBeVisible();
  await expect(canvas).toHaveCSS(
    "cursor",
    isMobile ? "auto" : /drawing-hand\.svg.*3 3/,
  );
  await expect(page.locator(".cue-hand")).toHaveCSS(
    "background-image",
    /drawing-hand\.svg/,
  );
  const hand = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/images/drawing-hand.svg";
    await image.decode();
    const surface = document.createElement("canvas");
    surface.width = image.naturalWidth;
    surface.height = image.naturalHeight;
    const context = surface.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      backgroundAlpha: context.getImageData(0, 0, 1, 1).data[3],
      fingertipAlpha: context.getImageData(3, 3, 1, 1).data[3],
      curledFingers: [
        [13, 34],
        [25, 50],
        [36, 50],
      ].map(
        ([horizontal, vertical]) =>
          context.getImageData(horizontal, vertical, 1, 1).data[3],
      ),
      fingerGaps: [
        [17, 47],
        [30, 50],
      ].map(
        ([horizontal, vertical]) =>
          context.getImageData(horizontal, vertical, 1, 1).data[3],
      ),
      checkerboardAlpha: context.getImageData(80, 10, 1, 1).data[3],
      wristAlpha: [
        [70, 50],
        [80, 56],
        [88, 62],
        [100, 70],
      ].map(
        ([horizontal, vertical]) =>
          context.getImageData(horizontal, vertical, 1, 1).data[3],
      ),
      rightEdgeAlpha: Array.from(
        context.getImageData(111, 0, 1, 76).data,
      ).filter((_, index) => index % 4 === 3),
      bottomEdgeAlpha: Array.from(
        context.getImageData(0, 75, 112, 1).data,
      ).filter((_, index) => index % 4 === 3),
    };
  });
  expect(hand.width).toBe(112);
  expect(hand.height).toBe(76);
  expect(hand.backgroundAlpha).toBe(0);
  expect(hand.checkerboardAlpha).toBe(0);
  expect(hand.fingertipAlpha).toBeGreaterThan(0);
  for (const alpha of hand.curledFingers) expect(alpha).toBeGreaterThan(0);
  for (const alpha of hand.fingerGaps) expect(alpha).toBe(0);
  expect(hand.wristAlpha[0]).toBeGreaterThan(240);
  expect(hand.wristAlpha[1]).toBeLessThan(hand.wristAlpha[0]);
  expect(hand.wristAlpha[2]).toBeLessThan(hand.wristAlpha[1]);
  expect(hand.wristAlpha[2]).toBeGreaterThan(0);
  expect(hand.wristAlpha[3]).toBe(0);
  expect(Math.max(...hand.rightEdgeAlpha, ...hand.bottomEdgeAlpha)).toBe(0);
  await expect(page.locator(".cue-hand")).toHaveCSS("animation-name", "none");
  await cue.screenshot({
    path: testInfo.outputPath("drawing-hand.png"),
    scale: "css",
  });
  if (isMobile) await canvas.tap({ position: { x: 90, y: 70 } });
  else await canvas.click({ position: { x: 90, y: 70 } });
  await expect(canvas).toHaveAttribute("data-marks", "1");
  await expect(cue).not.toBeVisible();
});

test("branded favicon and touch icon load at their declared sizes", async ({
  page,
  request,
}) => {
  for (const selector of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
    for (const icon of await page.locator(selector).all()) {
      const source = await icon.getAttribute("href");
      expect(source).toBeTruthy();
      const response = await request.get(source!);
      expect(response.ok()).toBeTruthy();
      if (new URL(source!, page.url()).pathname.endsWith(".png")) {
        const bytes = await response.body();
        const size = Number((await icon.getAttribute("sizes"))!.split("x")[0]);
        expect(bytes.readUInt32BE(16)).toBe(size);
        expect(bytes.readUInt32BE(20)).toBe(size);
      } else {
        const markup = await response.text();
        expect(markup).toContain("#a93832");
        const headerPaths = await page
          .locator(".site-header .brand-small svg path")
          .evaluateAll((elements) =>
            elements.map((element) => element.getAttribute("d")!),
          );
        for (const path of headerPaths) expect(markup).toContain(`d="${path}"`);
      }
    }
  }
});

test("artwork viewer supports keyboard, navigation and focus restoration", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "Open artwork viewer",
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#art-dialog-title")).toHaveText("Geometric faces");
  await page.getByRole("button", { name: "Next artwork" }).click();
  await expect(page.locator("#art-dialog-title")).toHaveText(
    "Leaves, in another form",
  );
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#art-dialog-title")).toHaveText("Geometric faces");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#art-dialog-title")).toHaveText(
    "A little closer to nature",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/dialog-open/);
});

test("FAQs expose booking details without a form", async ({ page }) => {
  const question = page.getByText("How do I book mehendi?", { exact: true });
  await question.click();
  await expect(
    page.getByText("Send a message on Instagram with your date", {
      exact: false,
    }),
  ).toBeVisible();
  await question.click();
  await expect(
    page.getByText("Send a message on Instagram with your date", {
      exact: false,
    }),
  ).not.toBeVisible();
});

test("mobile navigation opens, closes and follows anchors", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile navigation only");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Mehendi" })
    .click();
  await expect(page).toHaveURL(/#mehendi$/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).not.toBeVisible();
});

test("accessible main page and artwork dialog", async ({ page }) => {
  const mainResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mainResults.violations).toEqual([]);
  await page
    .getByRole("button", {
      name: "Open artwork viewer",
    })
    .click();
  const dialogResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dialogResults.violations).toEqual([]);
});

test("reduced motion preserves content and disables drawing animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("#living-line")).toHaveAttribute(
    "data-paused",
    "true",
  );
  await expect(page.locator("#living-line")).toHaveAttribute(
    "data-progress",
    "1.00",
  );
  await expect(
    page.getByRole("button", { name: "Resume drawing" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Add a red mark", exact: true })
    .click();
  await expect(page.locator("#living-line")).toHaveAttribute("data-marks", "1");
  await expect(page.locator(".origin-copy")).toHaveCSS("opacity", "1");
});

test("drawing-surface spans the whole hero without blocking its links", async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const canvas = page.locator("#living-line");
  const hero = (await page.locator(".hero").boundingBox())!;
  const bounds = (await canvas.boundingBox())!;
  const heading = (await page.locator(".hero-heading").boundingBox())!;
  const artist = (await page.locator("#artist").boundingBox())!;
  expect(bounds.x).toBeCloseTo(hero.x, 0);
  expect(bounds.y).toBeCloseTo(hero.y, 0);
  expect(bounds.width).toBeCloseTo(hero.width, 0);
  expect(bounds.height).toBeCloseTo(hero.height, 0);
  expect(bounds.y + bounds.height).toBeCloseTo(artist.y, 0);
  const positions = [
    { x: bounds.width / 2, y: heading.y - bounds.y + heading.height / 2 },
    { x: bounds.width * 0.75, y: bounds.height - 12 },
  ];
  for (const [index, position] of positions.entries()) {
    const readPixels = () =>
      canvas.evaluate((element, point) => {
        const ratio = element.width / element.clientWidth;
        const pixels = element
          .getContext("2d")!
          .getImageData(
            Math.round(point.x * ratio) - 20,
            Math.round(point.y * ratio) - 20,
            40,
            40,
          ).data;
        return Array.from(pixels).join(",");
      }, position);
    const before = await readPixels();
    if (isMobile) await canvas.tap({ position });
    else await canvas.click({ position });
    await expect(canvas).toHaveAttribute("data-marks", String(index + 1));
    expect(await readPixels()).not.toBe(before);
  }
  const booking = page.getByRole("link", {
    name: "Book mehendi",
    exact: false,
  });
  expect(
    await booking.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        ),
      );
    }),
  ).toBeTruthy();
  await page
    .getByRole("link", { name: "Explore the work", exact: true })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(canvas).toHaveAttribute("data-marks", "2");
});

test("living composition responds to touch, keyboard and replay", async ({
  page,
  isMobile,
}) => {
  const canvas = page.locator("#living-line");
  await expect(canvas).toHaveAttribute("data-visible", "true");
  await page
    .getByRole("button", { name: "Add a red mark", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-marks", "1");
  await canvas.focus();
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-marks", "2");
  if (isMobile) await canvas.tap({ position: { x: 100, y: 100 } });
  else await canvas.click({ position: { x: 100, y: 100 } });
  await expect(canvas).toHaveAttribute("data-marks", "3");
  await page
    .getByRole("button", { name: "Pause drawing", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-paused", "true");
  await page.getByRole("button", { name: "Compose another pattern" }).click();
  await expect(canvas).toHaveAttribute("data-variation", "1");
  await expect(canvas).toHaveAttribute("data-marks", "0");
  await expect(canvas).toHaveAttribute("data-progress", "1.00");
  await page
    .getByRole("button", { name: "Resume drawing", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-paused", "false");
});

test("canvas pixels are nonblank and stop changing when paused or offscreen", async ({
  page,
}) => {
  const canvas = page.locator("#living-line");
  await expect(canvas).toHaveAttribute("data-progress", "1.00", {
    timeout: 12000,
  });
  const coloredRatio = await canvas.evaluate((element) => {
    const surface = element as HTMLCanvasElement;
    const pixels = surface
      .getContext("2d")!
      .getImageData(0, 0, surface.width, surface.height).data;
    let colored = 0;
    for (let index = 3; index < pixels.length; index += 4)
      if (pixels[index] > 0) colored++;
    return colored / (surface.width * surface.height);
  });
  expect(coloredRatio).toBeGreaterThan(0.03);
  await page
    .getByRole("button", { name: "Pause drawing", exact: true })
    .click();
  const pausedFrames = await canvas.getAttribute("data-frame");
  await page.evaluate(async () => {
    for (let frame = 0; frame < 8; frame++)
      await new Promise(requestAnimationFrame);
  });
  await expect(canvas).toHaveAttribute("data-frame", pausedFrames!);
  await page
    .getByRole("button", { name: "Resume drawing", exact: true })
    .click();
  await expect
    .poll(() => canvas.getAttribute("data-frame"))
    .not.toBe(pausedFrames);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-visible", "false");
  const offscreenFrames = await canvas.getAttribute("data-frame");
  await page.evaluate(async () => {
    for (let frame = 0; frame < 8; frame++)
      await new Promise(requestAnimationFrame);
  });
  await expect(canvas).toHaveAttribute("data-frame", offscreenFrames!);
});

test("text, artwork and Instagram enquiries exist without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("IOFSHAPES");
  await expect(page.locator(".origin-person")).toContainText(
    "Haimanti Paul Nayak",
  );
  await expect(page.locator(".origin-copy > p")).toHaveCount(2);
  await expect(page.locator(".origin-copy > p").first()).toContainText(
    "detailed linework",
  );
  await expect(page.locator(".origin-copy > p").nth(1)).toContainText(
    "On canvas, those lines",
  );
  await expect(page.locator(".origin-note")).toBeVisible();
  await expect(page.locator(".origin-note")).toContainText("since birth");
  await expect(page.locator(".invitation")).toContainText("Bridal mehendi");
  await expect(page.locator(".folio-grid img")).toHaveCount(3);
  await expect(page.locator(".art-study")).not.toBeVisible();
  await expect(page.locator('[data-artwork="0"]')).toHaveAttribute(
    "href",
    "/images/CanvasArt.jpg",
  );
  await expect(page.locator(".instagram-qr")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Book mehendi", exact: false }),
  ).toHaveAttribute("href", "https://ig.me/m/iofshapes");
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ||
      "{}",
  );
  expect(
    schema["@graph"].find(
      (entry: { "@type": string }) => entry["@type"] === "Person",
    ).name,
  ).toBe("Haimanti Paul Nayak");
  await context.close();
});

test("animation stays within its rendering budget under CPU throttling", async ({
  page,
}, testInfo) => {
  const canvas = page.locator("#living-line");
  await expect(canvas).toHaveAttribute("data-progress", "1.00", {
    timeout: 12000,
  });
  const session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const before = await session.send("Performance.getMetrics");
  const sample = await canvas.evaluate(async (element) => {
    const surface = element as HTMLCanvasElement;
    const firstFrame = Number(surface.dataset.frame);
    const started = performance.now();
    while (performance.now() - started < 1200)
      await new Promise(requestAnimationFrame);
    return {
      elapsedMs: performance.now() - started,
      renderedFrames: Number(surface.dataset.frame) - firstFrame,
    };
  });
  const after = await session.send("Performance.getMetrics");
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const metric = (values: { name: string; value: number }[], name: string) =>
    values.find((entry) => entry.name === name)!.value;
  const scriptMs =
    (metric(after.metrics, "ScriptDuration") -
      metric(before.metrics, "ScriptDuration")) *
    1000;
  const measurements = {
    ...sample,
    scriptMs,
    scriptPercent: (scriptMs / sample.elapsedMs) * 100,
    framesPerSecond: (sample.renderedFrames / sample.elapsedMs) * 1000,
    cpuSlowdown: 4,
  };
  await testInfo.attach("animation-performance", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  console.log(
    `${testInfo.project.name} animation: ${JSON.stringify(measurements)}`,
  );
  expect(sample.renderedFrames).toBeGreaterThan(5);
  expect(measurements.framesPerSecond).toBeLessThanOrEqual(33);
  expect(measurements.scriptPercent).toBeLessThan(40);
  await session.detach();
});

test("responsive artwork, layout and screenshots", async ({
  page,
}, testInfo) => {
  const widths =
    testInfo.project.name === "mobile"
      ? [320, 375, 390, 540, 760]
      : [768, 1024, 1440, 1920];
  for (const width of widths) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBeTruthy();
    const headingFits = await page.locator("h1").evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const bounds = range.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth;
    });
    expect(headingFits, `Brand must fit at ${width}px`).toBeTruthy();
    const title = (await page.locator("#hero-title").boundingBox())!;
    const attribution = (await page.locator(".attribution").boundingBox())!;
    const location = (await page.locator(".hero-byline > span").boundingBox())!;
    expect(
      Math.abs(
        attribution.x + attribution.width / 2 - (title.x + title.width / 2),
      ),
      `Attribution centered below the title at ${width}px`,
    ).toBeLessThan(1);
    const titleGap = attribution.y - (title.y + title.height);
    expect(titleGap).toBeGreaterThanOrEqual(0);
    expect(titleGap).toBeLessThanOrEqual(12);
    if (width <= 760) {
      expect(location.y).toBeGreaterThanOrEqual(
        attribution.y + attribution.height,
      );
      expect(
        Math.abs(location.x + location.width / 2 - (title.x + title.width / 2)),
      ).toBeLessThan(1);
    } else {
      expect(location.x).toBeGreaterThan(attribution.x + attribution.width);
    }
    for (const selector of [".attribution", ".hero-byline > span"]) {
      expect(
        await page.locator(selector).evaluate((element) => {
          const text = document.createRange();
          text.selectNodeContents(element);
          const bounds = text.getBoundingClientRect();
          return (
            bounds.left >= 0 &&
            bounds.right <= innerWidth &&
            element.scrollWidth <= element.clientWidth
          );
        }),
        `${selector} fits at ${width}px`,
      ).toBeTruthy();
    }
    const continuation = await page
      .locator("#artist")
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(continuation, `Next chapter visible at ${width}px`).toBeLessThan(
      width < 768 ? 844 : 1000,
    );
    const work = await page.locator(".work-item").evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
        };
      }),
    );
    expect(work[1].left).toBeGreaterThan(work[0].right);
    expect(work[2].left).toBeGreaterThan(work[1].right);
    expect(Math.abs(work[0].top - work[2].top)).toBeLessThan(2);
    const study = (await page.locator(".art-study").boundingBox())!;
    expect(work[0].top).toBeGreaterThan(study.y + study.height);
    await page.screenshot({
      path: testInfo.outputPath(`viewport-${width}.png`),
      fullPage: true,
      scale: "css",
      animations: "disabled",
    });
  }
});

test("no runtime errors or broken local resources", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()}: ${response.url()}`);
  });
  await page.reload();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("IOFSHAPES");
  expect(errors).toEqual([]);
});
