type Mark = { x: number; y: number; born: number };

export function mountLivingLine(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const drawing = context;
  const surface = canvas
    .closest(".hero")!
    .querySelector<HTMLElement>(".living-surface")!;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const pause = document.querySelector<HTMLButtonElement>("#pause-line")!;
  const replay = document.querySelector<HTMLButtonElement>("#replay-line")!;
  const add = document.querySelector<HTMLButtonElement>("#add-mark")!;
  const status = document.querySelector<HTMLElement>("#line-status")!;
  const completePatterns = new Map<string, Path2D>();
  let completedFrame: HTMLCanvasElement | null = null;
  let width = 1;
  let height = 1;
  let compositionTop = 0;
  let compositionHeight = 1;
  let elapsed = motion.matches ? 7000 : 0;
  let lastFrame = 0;
  let frame = 0;
  let visible = true;
  let paused = motion.matches;
  let variation = 0;
  let frameCount = 0;
  let marks: Mark[] = [];
  const ink = "#292d29";
  const red = "#a93832";

  function curve(points: number[][], color: string, thickness = 1) {
    drawing.beginPath();
    points.forEach(([horizontal, vertical], index) => {
      if (index === 0) drawing.moveTo(horizontal, vertical);
      else drawing.lineTo(horizontal, vertical);
    });
    drawing.strokeStyle = color;
    drawing.lineWidth = thickness;
    drawing.stroke();
  }

  function blossom(
    horizontal: number,
    vertical: number,
    radius: number,
    progress: number,
    color: string,
    seed = 0,
  ) {
    const key = `${radius}:${seed}`;
    drawing.save();
    drawing.translate(horizontal, vertical);
    drawing.strokeStyle = color;
    drawing.lineWidth = 1.3;
    const cached = completePatterns.get(key);
    if (progress >= 1 && cached) {
      drawing.stroke(cached);
      drawing.restore();
      return;
    }
    const pattern = new Path2D();
    for (let ring = 0; ring < 10; ring++) {
      const ringProgress = Math.max(
        0,
        Math.min(1, progress * 1.9 - ring * 0.09),
      );
      if (ringProgress === 0) continue;
      const petals = 12 + (seed % 4);
      const base = radius * (0.15 + ring * 0.073);
      const amplitude = radius * (0.024 + ring * 0.014);
      for (let step = 0; step <= 440 * ringProgress; step++) {
        const angle = (step / 440) * Math.PI * 2;
        const distance =
          base +
          amplitude * Math.abs(Math.sin((angle * petals) / 2 + seed * 0.3));
        const wobble = Math.sin(angle * 23 + ring) * 0.65;
        const horizontalPoint = Math.cos(angle) * (distance + wobble);
        const verticalPoint = Math.sin(angle) * (distance + wobble);
        if (step === 0) pattern.moveTo(horizontalPoint, verticalPoint);
        else pattern.lineTo(horizontalPoint, verticalPoint);
      }
    }
    if (progress > 0.6) {
      for (let petal = 0; petal < 36; petal++) {
        const angle = (petal / 36) * Math.PI * 2;
        const inner = radius * 0.97;
        pattern.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        pattern.lineTo(
          Math.cos(angle + 0.018) * (inner + 9),
          Math.sin(angle + 0.018) * (inner + 9),
        );
      }
    }
    drawing.stroke(pattern);
    if (progress >= 1) completePatterns.set(key, pattern);
    drawing.restore();
  }

  function render() {
    drawing.clearRect(0, 0, width, height);
    const compact = width < 761;
    const scale = compact
      ? Math.min(width / 600, compositionHeight / 650)
      : Math.min(width / 1180, compositionHeight / 600);
    const centreX = compact ? width * 0.52 : width * 0.65;
    const centreY =
      compositionTop + compositionHeight * (compact ? 0.48 : 0.49);
    const growth = Math.min(1, elapsed / 4400);
    const breath = paused ? 0 : Math.sin(elapsed / 3200) * 0.016;
    if (growth === 1 && completedFrame) {
      drawing.save();
      drawing.translate(centreX, centreY);
      drawing.rotate(breath);
      drawing.drawImage(completedFrame, -centreX, -centreY, width, height);
      drawing.restore();
    } else {
      drawing.save();
      drawing.translate(centreX, centreY);
      drawing.scale(scale, scale);
      drawing.lineCap = "round";
      drawing.lineJoin = "round";

      drawing.fillStyle = "#dab044";
      drawing.beginPath();
      drawing.arc(30, -20, 167, -Math.PI * 0.98, Math.PI * 0.02);
      drawing.lineTo(197, 60);
      drawing.lineTo(-137, 60);
      drawing.fill();
      drawing.fillStyle = "#91b1b7";
      drawing.fillRect(-114, 60, 152, 186);
      drawing.fillStyle = "#d69ba3";
      drawing.beginPath();
      drawing.arc(161, 100, 96, 0, Math.PI * 2);
      drawing.fill();

      for (let column = 0; column < 14; column++) {
        const columnHeight = 80 + column * 9;
        const points: number[][] = [];
        const reveal = Math.min(1, Math.max(0, growth * 1.7 - column * 0.035));
        for (let step = 0; step <= 100 * reveal; step++) {
          const position = step / 100;
          points.push([
            -155 + column * 11 + Math.sin(position * 3.14) * 6,
            125 + position * columnHeight,
          ]);
        }
        curve(points, "#556963", 0.65);
      }
      drawing.save();
      drawing.rotate(variation * 0.08);
      blossom(30, -18, 212, growth, ink, variation);
      blossom(
        184,
        131,
        105,
        Math.max(0, growth * 1.45 - 0.4),
        red,
        variation + 2,
      );
      blossom(
        -196,
        -137,
        92,
        Math.max(0, growth * 1.5 - 0.3),
        ink,
        variation + 1,
      );
      drawing.restore();

      if (growth > 0.35) {
        const detailProgress = Math.min(1, (growth - 0.35) / 0.65);
        drawing.save();
        drawing.beginPath();
        drawing.rect(-300, -340, 620 * detailProgress, 680);
        drawing.clip();
        drawing.fillStyle = "#f3f2e9";
        drawing.strokeStyle = ink;
        drawing.lineWidth = 2;
        drawing.beginPath();
        drawing.moveTo(-40, -18);
        drawing.quadraticCurveTo(30, -83, 100, -18);
        drawing.quadraticCurveTo(30, 46, -40, -18);
        drawing.fill();
        drawing.stroke();
        drawing.fillStyle = "#86afb9";
        drawing.beginPath();
        drawing.arc(30, -18, 25, 0, Math.PI * 2);
        drawing.fill();
        drawing.stroke();
        drawing.fillStyle = ink;
        drawing.beginPath();
        drawing.arc(30, -18, 11, 0, Math.PI * 2);
        drawing.fill();
        drawing.fillStyle = "#f3f2e9";
        drawing.beginPath();
        drawing.arc(35, -25, 4, 0, Math.PI * 2);
        drawing.fill();
        curve(
          [
            [-226, 13],
            [-226, 200],
            [-187, 200],
            [-187, 13],
            [-226, 13],
          ],
          ink,
          1.8,
        );
        for (let tile = 0; tile < 7; tile++) {
          const top = 19 + tile * 25;
          curve(
            [
              [-222, top + 20],
              [-207, top],
              [-191, top + 20],
              [-222, top + 20],
            ],
            ink,
            1.1,
          );
          curve(
            [
              [-217, top + 16],
              [-207, top + 5],
              [-196, top + 16],
            ],
            ink,
            0.8,
          );
        }
        for (let leaf = 0; leaf < 8; leaf++) {
          const angle = -1.4 + leaf * 0.23;
          const stemX = 30 + Math.cos(angle) * 242;
          const stemY = -18 + Math.sin(angle) * 242;
          drawing.save();
          drawing.translate(stemX, stemY);
          drawing.rotate(angle);
          drawing.beginPath();
          drawing.moveTo(0, 0);
          drawing.quadraticCurveTo(28, -21, 48, 0);
          drawing.quadraticCurveTo(28, 17, 0, 0);
          drawing.stroke();
          curve(
            [
              [0, 0],
              [41, 0],
            ],
            ink,
            0.8,
          );
          drawing.restore();
        }
        drawing.restore();
      }

      for (let band = 0; band < 3; band++) {
        const points: number[][] = [];
        for (let step = 0; step <= 150 * growth; step++) {
          const angle = Math.PI * 0.64 + (step / 150) * Math.PI * 1.54;
          const radius = 270 + band * 12;
          points.push([
            30 + Math.cos(angle) * radius,
            -18 + Math.sin(angle) * radius,
          ]);
        }
        curve(points, band === 1 ? "#a9383290" : "#292d2980", 0.7);
      }
      const thread: number[][] = [];
      const length = Math.min(1, elapsed / 2500);
      for (let step = 0; step <= 320 * length; step++) {
        const position = step / 320;
        thread.push([
          -930 + position * 1260,
          125 + Math.sin(position * Math.PI * 2.6) * 120 - position * 66,
        ]);
      }
      curve(thread, red, 3);
      drawing.restore();
      if (growth === 1) {
        completedFrame = document.createElement("canvas");
        completedFrame.width = canvas.width;
        completedFrame.height = canvas.height;
        completedFrame.getContext("2d")?.drawImage(canvas, 0, 0);
      }
    }
    for (const mark of marks) {
      const progress = paused ? 1 : Math.min(1, (elapsed - mark.born) / 900);
      blossom(
        mark.x * width,
        mark.y * height,
        compact ? 33 : 48,
        progress,
        red,
        variation + 3,
      );
    }
    canvas.dataset.progress = growth.toFixed(2);
    canvas.dataset.marks = String(marks.length);
    canvas.dataset.variation = String(variation);
    canvas.dataset.frame = String(++frameCount);
  }

  function animate(time: number) {
    frame = 0;
    if (!visible || document.hidden || paused) return;
    if (!lastFrame || time - lastFrame >= 32) {
      elapsed += lastFrame ? Math.min(time - lastFrame, 80) : 33;
      lastFrame = time;
      render();
    }
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    canvas.dataset.paused = String(paused);
    canvas.dataset.visible = String(visible);
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute(
      "aria-label",
      paused ? "Resume drawing" : "Pause drawing",
    );
    pause.dataset.tooltip = paused ? "Resume drawing" : "Pause drawing";
    render();
    if (visible && !document.hidden && !paused)
      frame = requestAnimationFrame(animate);
  }

  function addMark(horizontal = 0.28, vertical = 0.48) {
    canvas.dataset.interacted = "true";
    marks = [
      ...marks.slice(-11),
      { x: horizontal, y: vertical, born: elapsed },
    ];
    status.textContent = "A new red mark has joined the composition.";
    render();
  }

  function resize() {
    completedFrame = null;
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const surfaceBounds = surface.getBoundingClientRect();
    const inset =
      parseFloat(
        getComputedStyle(surface).getPropertyValue("--drawing-inset-bottom"),
      ) || 0;
    compositionTop = surfaceBounds.top - bounds.top;
    compositionHeight = Math.max(1, surfaceBounds.height - inset);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    drawing.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  observer.observe(surface);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    },
    { threshold: 0.05 },
  ).observe(canvas);
  document.addEventListener("visibilitychange", syncAnimation);
  pause.addEventListener("click", () => {
    paused = !paused;
    syncAnimation();
  });
  replay.addEventListener("click", () => {
    variation = (variation + 1) % 8;
    completedFrame = null;
    completePatterns.clear();
    marks = [];
    elapsed = paused ? 7000 : 0;
    status.textContent = "A new composition has begun.";
    syncAnimation();
  });
  add.addEventListener("click", () =>
    addMark(0.22 + (marks.length % 4) * 0.13, 0.32 + (marks.length % 3) * 0.13),
  );
  canvas.addEventListener("click", (event) => {
    const bounds = canvas.getBoundingClientRect();
    addMark(
      (event.clientX - bounds.left) / width,
      (event.clientY - bounds.top) / height,
    );
  });
  canvas.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") canvas.dataset.hovered = "true";
  });
  canvas.addEventListener("pointerleave", () => {
    delete canvas.dataset.hovered;
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addMark();
    }
  });
  motion.addEventListener("change", () => {
    paused = motion.matches;
    if (paused) elapsed = 7000;
    syncAnimation();
  });
  resize();
  syncAnimation();
}
