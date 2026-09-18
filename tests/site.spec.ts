import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
    await expect(link).toHaveAttribute(
      "href",
      "https://www.instagram.com/____tiny_apocalypse/",
    );
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

test("all three artwork images appear once in the folio", async ({ page }) => {
  await expect(page.locator("main img")).toHaveCount(3);
  await expect(page.locator(".work-item")).toHaveCount(3);
  const images = await page
    .locator("main img")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("src")),
    );
  expect(new Set(images).size).toBe(images.length);
  await expect(page.locator(".origin img")).toHaveCount(0);
  await expect(page.locator(".invitation img")).toHaveCount(0);
  await page
    .getByRole("button", { name: "View Botanical mehendi among flowers" })
    .click();
  await expect(page.locator("#art-dialog-title")).toHaveText(
    "A little closer to nature",
  );
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
  await expect(canvas).toHaveCSS("cursor", /drawing-hand\.svg.*3 3/);
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
      wristAlpha: [[70, 50], [80, 56], [88, 62], [100, 70]].map(
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
    name: "View Geometric faces, original canvas painting",
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
      name: "View Geometric faces, original canvas painting",
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
  await expect(page.locator(".origin-copy > p").first()).toContainText("detailed linework");
  await expect(page.locator(".origin-copy > p").nth(1)).toContainText("On canvas, those lines");
  await expect(page.locator(".origin-note")).toBeVisible();
  await expect(page.locator(".origin-note")).toContainText("since birth");
  await expect(page.locator(".invitation")).toContainText("Bridal mehendi");
  await expect(page.locator("main img")).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "Book mehendi", exact: false }),
  ).toHaveAttribute("href", "https://www.instagram.com/____tiny_apocalypse/");
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
    if (width <= 760) {
      expect(work[1].top).toBeGreaterThan(work[0].bottom);
      expect(Math.abs(work[1].top - work[2].top)).toBeLessThan(2);
    } else {
      expect(work[1].left).toBeGreaterThan(work[0].right);
      expect(work[2].left).toBeGreaterThan(work[1].right);
      expect(
        Math.max(...work.map((item) => item.top)) -
          Math.min(...work.map((item) => item.top)),
      ).toBeLessThan(80);
    }
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
