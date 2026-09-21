import { mountPigmentField } from "./pigment-field.ts";
import { mountTouchGestures } from "./touch-gestures.ts";

type Artwork = {
  title: string;
  description: string;
  image: string;
  alt: string;
};

export function mountArtworkStudy(
  artworks: Artwork[],
  onExpand: (index: number, trigger: HTMLButtonElement) => void,
) {
  const folio = document.querySelector<HTMLElement>("#work")!;
  const study = folio.querySelector<HTMLElement>(".art-study")!;
  const viewport = study.querySelector<HTMLElement>(".study-viewport")!;
  const image = study.querySelector<HTMLImageElement>(".study-image")!;
  const release = study.querySelector<HTMLInputElement>("#study-release")!;
  const output = study.querySelector<HTMLOutputElement>("#study-amount")!;
  const title = study.querySelector<HTMLElement>("#study-title")!;
  const status = study.querySelector<HTMLElement>("#study-status")!;
  const expand = study.querySelector<HTMLButtonElement>("#study-expand")!;
  const modes = study.querySelectorAll<HTMLButtonElement>("[data-study-mode]");
  const selectors = folio.querySelectorAll<HTMLAnchorElement>("[data-artwork]");
  const field = mountPigmentField(
    study.querySelector<HTMLCanvasElement>(".pigment-canvas")!,
    image,
  );
  let selected = 0;
  let loadedSource = "";
  let mode = "original";
  let point = { x: 0.5, y: 0.5 };

  function setMode(value: string) {
    mode = field ? value : "original";
    viewport.dataset.mode = mode;
    release.disabled = mode !== "pigment";
    modes.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.studyMode === mode),
      );
    });
    field?.enable(mode === "pigment");
  }

  function reset() {
    release.value = "35";
    output.value = "35%";
    field?.release(0.35);
    setMode("original");
  }

  function selectArtwork(index: number) {
    selected = index;
    point = { x: 0.5, y: 0.5 };
    const artwork = artworks[index];
    title.textContent = artwork.title;
    study.querySelector(".study-description")!.textContent =
      artwork.description;
    study.querySelector(".study-index")!.textContent =
      `${String(index + 1).padStart(2, "0")} / ${String(artworks.length).padStart(2, "0")}`;
    study.querySelector(".study-material")!.textContent =
      index === 0 ? "Pigment / canvas" : "Henna / skin";
    image.alt = artwork.alt;
    status.classList.add("sr-only");
    status.textContent = "Loading artwork";
    viewport.setAttribute("aria-busy", "true");
    viewport.dataset.loaded = "false";
    field?.clear();
    loadedSource = new URL(artwork.image, location.href).href;
    image.src = artwork.image;
    selectors.forEach((selector, selectorIndex) => {
      selector.setAttribute("aria-current", String(selectorIndex === index));
    });
  }

  image.addEventListener("load", () => {
    if (image.currentSrc !== loadedSource) return;
    viewport.setAttribute("aria-busy", "false");
    viewport.dataset.loaded = "true";
    status.textContent = `${artworks[selected].title} selected`;
    field?.load();
  });
  image.addEventListener("error", () => {
    viewport.setAttribute("aria-busy", "false");
    status.classList.remove("sr-only");
    status.textContent =
      "This artwork could not load. Choose another work or open the original.";
  });
  selectors.forEach((selector, index) => {
    selector.addEventListener("click", (event) => {
      event.preventDefault();
      selectArtwork(index);
    });
  });
  modes.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.studyMode!);
    });
  });
  release.addEventListener("input", () => {
    field?.release(Number(release.value) / 100);
    output.value = `${release.value}%`;
  });
  study.querySelector("#study-reset")!.addEventListener("click", reset);
  study.querySelector("#study-stir")!.addEventListener("click", () => {
    setMode("pigment");
    point = { x: 0.5, y: 0.5 };
    field?.touch(0.5, 0.5);
  });
  expand.addEventListener("click", () => onExpand(selected, expand));
  function gesture(event: PointerEvent) {
    if (mode !== "pigment") return;
    const bounds = viewport.getBoundingClientRect();
    point = {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
    field?.touch(point.x, point.y);
  }
  mountTouchGestures(viewport, {
    onTap: gesture,
    onSwipe: (direction) =>
      selectArtwork((selected + direction + artworks.length) % artworks.length),
  });
  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") gesture(event);
  });
  viewport.addEventListener("pointermove", (event) => {
    if (
      event.pointerType !== "touch" &&
      (event.pointerType === "mouse" || event.buttons)
    )
      gesture(event);
  });
  viewport.addEventListener("keydown", (event) => {
    if (event.key === "Home" || event.key === "Escape") {
      event.preventDefault();
      reset();
      return;
    }
    if (mode !== "pigment") return;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-0.1, 0],
      ArrowRight: [0.1, 0],
      ArrowUp: [0, -0.1],
      ArrowDown: [0, 0.1],
      Enter: [0, 0],
      " ": [0, 0],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    point = {
      x: Math.max(0, Math.min(1, point.x + direction[0])),
      y: Math.max(0, Math.min(1, point.y + direction[1])),
    };
    field?.touch(point.x, point.y);
  });

  study.hidden = false;
  folio.classList.add("study-ready");
  setMode("pigment");
  selectArtwork(0);
}
