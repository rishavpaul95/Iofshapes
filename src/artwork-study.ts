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
  const zoom = study.querySelector<HTMLInputElement>("#study-zoom")!;
  const output = study.querySelector<HTMLOutputElement>("#study-scale")!;
  const title = study.querySelector<HTMLElement>("#study-title")!;
  const status = study.querySelector<HTMLElement>("#study-status")!;
  const expand = study.querySelector<HTMLButtonElement>("#study-expand")!;
  const modes = study.querySelectorAll<HTMLButtonElement>("[data-study-mode]");
  const selectors = folio.querySelectorAll<HTMLAnchorElement>("[data-artwork]");
  let selected = 0;
  let magnification = 1;
  let horizontal = 50;
  let vertical = 50;
  let drag: { pointer: number; x: number; y: number } | null = null;
  let loadedSource = "";

  function panLimits() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const fit = Math.min(
      width / (image.naturalWidth || 1),
      height / (image.naturalHeight || 1),
    );
    return {
      horizontal: Math.max(0, image.naturalWidth * fit * magnification - width),
      vertical: Math.max(0, image.naturalHeight * fit * magnification - height),
    };
  }

  function render() {
    const limits = panLimits();
    image.style.transform = `translate(${((50 - horizontal) * limits.horizontal) / 100}px, ${((50 - vertical) * limits.vertical) / 100}px) scale(${magnification})`;
    zoom.value = String(magnification);
    output.value = `${magnification.toFixed(1)}x`;
    viewport.dataset.detail = String(magnification > 1);
    modes.forEach((button) => {
      const active =
        button.dataset.studyMode === (magnification > 1 ? "detail" : "whole");
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function reset() {
    horizontal = 50;
    vertical = 50;
    magnification = 1;
    render();
  }

  function move(horizontalDelta: number, verticalDelta: number) {
    horizontal = Math.max(0, Math.min(100, horizontal + horizontalDelta));
    vertical = Math.max(0, Math.min(100, vertical + verticalDelta));
    render();
  }

  function selectArtwork(index: number) {
    selected = index;
    const artwork = artworks[index];
    title.textContent = artwork.title;
    study.querySelector(".study-description")!.textContent =
      artwork.description;
    study.querySelector(".study-index")!.textContent =
      `${String(index + 1).padStart(2, "0")} / ${String(artworks.length).padStart(2, "0")}`;
    image.alt = artwork.alt;
    status.classList.add("sr-only");
    status.textContent = "Loading artwork";
    viewport.setAttribute("aria-busy", "true");
    loadedSource = new URL(artwork.image, location.href).href;
    image.src = artwork.image;
    selectors.forEach((selector, selectorIndex) => {
      selector.setAttribute("aria-current", String(selectorIndex === index));
    });
    reset();
  }

  image.addEventListener("load", () => {
    if (image.currentSrc !== loadedSource) return;
    viewport.setAttribute("aria-busy", "false");
    status.textContent = `${artworks[selected].title} selected`;
    render();
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
      magnification = button.dataset.studyMode === "detail" ? 2.5 : 1;
      render();
    });
  });
  zoom.addEventListener("input", () => {
    magnification = Number(zoom.value);
    render();
  });
  study.querySelector("#study-reset")!.addEventListener("click", reset);
  expand.addEventListener("click", () => onExpand(selected, expand));
  viewport.addEventListener("pointerdown", (event) => {
    if (magnification <= 1 || event.button !== 0) return;
    drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    viewport.setPointerCapture(event.pointerId);
    viewport.dataset.dragging = "true";
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const limits = panLimits();
    move(
      limits.horizontal
        ? ((drag.x - event.clientX) * 100) / limits.horizontal
        : 0,
      limits.vertical ? ((drag.y - event.clientY) * 100) / limits.vertical : 0,
    );
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  viewport.addEventListener("lostpointercapture", () => {
    drag = null;
    delete viewport.dataset.dragging;
  });
  viewport.addEventListener("keydown", (event) => {
    if (event.key === "Home") {
      event.preventDefault();
      reset();
      return;
    }
    if (magnification <= 1) return;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-5, 0],
      ArrowRight: [5, 0],
      ArrowUp: [0, -5],
      ArrowDown: [0, 5],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    move(...direction);
  });

  study.hidden = false;
  folio.classList.add("study-ready");
  new ResizeObserver(render).observe(viewport);
  selectArtwork(0);
}
