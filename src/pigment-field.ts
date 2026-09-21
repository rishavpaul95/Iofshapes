type Pigment = {
  x: number;
  y: number;
  red: number;
  green: number;
  blue: number;
  phase: number;
};

export function mountPigmentField(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
) {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let pigments: Pigment[] = [];
  let width = 1;
  let height = 1;
  let enabled = false;
  let visible = false;
  let spread = 0.35;
  let gesture = 0;
  let frame = 0;
  let previousTime = 0;
  let pointer = { x: 0.5, y: 0.5 };

  function paint() {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (!pigments.length) return;
    const fit = Math.min(
      (width * 0.76) / image.naturalWidth,
      (height * 0.88) / image.naturalHeight,
    );
    const artworkWidth = image.naturalWidth * fit;
    const artworkHeight = image.naturalHeight * fit;
    const left = (width - artworkWidth) / 2;
    const top = (height - artworkHeight) / 2;
    const strength = spread * (0.25 + gesture * 0.75);
    context.save();
    context.beginPath();
    context.rect(
      width < 600 ? 30 : 56,
      12,
      width - (width < 600 ? 42 : 68),
      height - 24,
    );
    context.rect(left - 10, top - 10, artworkWidth + 20, artworkHeight + 20);
    context.clip("evenodd");
    context.globalAlpha = 0.3 + strength * 0.55;
    context.lineCap = "round";
    for (const pigment of pigments) {
      const horizontalEdge =
        Math.abs(pigment.x - 0.5) > Math.abs(pigment.y - 0.5);
      const normalX = horizontalEdge ? (pigment.x < 0.5 ? -1 : 1) : 0;
      const normalY = horizontalEdge ? 0 : pigment.y < 0.5 ? -1 : 1;
      const anchorX =
        left +
        (horizontalEdge
          ? normalX < 0
            ? 0
            : artworkWidth
          : pigment.x * artworkWidth);
      const anchorY =
        top +
        (horizontalEdge
          ? pigment.y * artworkHeight
          : normalY < 0
            ? 0
            : artworkHeight);
      const distance = Math.hypot(
        anchorX - pointer.x * width,
        anchorY - pointer.y * height,
      );
      const influence = Math.max(
        0,
        1 - distance / Math.max(artworkWidth, artworkHeight),
      );
      const room = horizontalEdge ? left : top;
      const reach =
        Math.max(12, room - 18) * (0.18 + strength * (0.4 + influence * 0.4));
      const length = 16 + (pigment.phase + 0.6) * 34 + strength * 40;
      const bend = (pointer.x - pointer.y) * gesture * 30;
      const startX = anchorX + normalX * 12;
      const startY = anchorY + normalY * 12;
      context.strokeStyle = `rgb(${pigment.red} ${pigment.green} ${pigment.blue})`;
      context.lineWidth = 0.8 + (pigment.phase + 0.6) * 0.7;
      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(
        startX + normalX * reach - normalY * (length * 0.3 + bend),
        startY + normalY * reach + normalX * (length * 0.3 + bend),
        startX + normalX * reach - normalY * length * 0.8,
        startY + normalY * reach + normalX * length * 0.8,
        startX - normalY * length,
        startY + normalX * length,
      );
      context.stroke();
    }
    context.restore();
    canvas.dataset.frame = String(Number(canvas.dataset.frame || 0) + 1);
    canvas.dataset.gesture = gesture.toFixed(2);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function animate(time: number) {
    frame = 0;
    if (!enabled || !visible || document.hidden || motion.matches) return;
    const elapsed = previousTime ? Math.min(80, time - previousTime) : 33;
    if (!previousTime || elapsed >= 32) {
      gesture = Math.max(0, gesture - elapsed / 1500);
      previousTime = time;
      paint();
    }
    if (gesture > 0) frame = requestAnimationFrame(animate);
    else previousTime = 0;
  }

  function wake() {
    if (!enabled || !visible || document.hidden) return;
    if (motion.matches) paint();
    else if (!frame) frame = requestAnimationFrame(animate);
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint();
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else stop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : wake(),
  );
  motion.addEventListener("change", () => {
    stop();
    gesture = 0;
    paint();
  });

  return {
    load() {
      stop();
      const sample = document.createElement("canvas");
      sample.width = 72;
      sample.height = Math.min(
        144,
        Math.round((72 * image.naturalHeight) / image.naturalWidth),
      );
      const sampling = sample.getContext("2d", { willReadFrequently: true });
      if (!sampling) return;
      sampling.drawImage(image, 0, 0, sample.width, sample.height);
      const pixels = sampling.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      pigments = [];
      for (let vertical = 0; vertical < sample.height; vertical += 4) {
        for (let horizontal = 0; horizontal < sample.width; horizontal += 4) {
          const offset = (vertical * sample.width + horizontal) * 4;
          const channels = [
            pixels[offset],
            pixels[offset + 1],
            pixels[offset + 2],
          ];
          if (Math.max(...channels) - Math.min(...channels) < 35) continue;
          pigments.push({
            x: horizontal / sample.width,
            y: vertical / sample.height,
            red: pixels[offset],
            green: pixels[offset + 1],
            blue: pixels[offset + 2],
            phase: Math.sin(horizontal * 13 + vertical * 7) * 0.6,
          });
        }
      }
      canvas.dataset.pigments = String(pigments.length);
      gesture = 0;
      resize();
      wake();
    },
    clear() {
      stop();
      pigments = [];
      context?.clearRect(0, 0, width, height);
    },
    enable(value: boolean) {
      enabled = value;
      if (!enabled) stop();
      else {
        gesture = motion.matches ? 0 : 1;
        paint();
        wake();
      }
    },
    release(value: number) {
      spread = value;
      gesture = 1;
      wake();
    },
    touch(horizontal: number, vertical: number) {
      pointer = {
        x: Math.max(0, Math.min(1, horizontal)),
        y: Math.max(0, Math.min(1, vertical)),
      };
      gesture = 1;
      wake();
    },
  };
}
