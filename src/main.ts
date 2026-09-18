import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import {
  createIcons,
  Asterisk,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Menu,
  X,
  Expand,
  PenLine,
  RotateCw,
  Pause,
  Play,
  Plus,
  Instagram,
} from "lucide";
import "./style.css";
import { mountLivingLine } from "./living-line.ts";

createIcons({
  icons: {
    Asterisk,
    ArrowUpRight,
    ArrowDownRight,
    ArrowDown,
    ArrowUp,
    ArrowLeft,
    ArrowRight,
    Menu,
    X,
    Expand,
    PenLine,
    RotateCw,
    Pause,
    Play,
    Plus,
    Instagram,
  },
});

const menuToggle = document.querySelector<HTMLButtonElement>(".menu-toggle")!;
const mobileNav = document.querySelector<HTMLElement>("#mobile-nav")!;

function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
}

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  mobileNav.hidden = isOpen;
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Open navigation" : "Close navigation",
  );
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("click", (event) => {
  if (
    event.target instanceof Node &&
    !mobileNav.contains(event.target) &&
    !menuToggle.contains(event.target)
  )
    closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});
window.matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);

mountLivingLine(document.querySelector<HTMLCanvasElement>("#living-line")!);

const artworks = [
  {
    title: "Geometric faces",
    description: "Original canvas painting by Haimanti Paul Nayak",
    image: `${import.meta.env.BASE_URL}images/CanvasArt.jpg`,
    alt: "Full canvas painting of two geometric faces with mustard floral bands, blue shapes and pink details.",
    source: "https://www.instagram.com/____tiny_apocalypse/",
  },
  {
    title: "Leaves, in another form",
    description: "Botanical mehendi by Haimanti Paul Nayak",
    image: `${import.meta.env.BASE_URL}images/mehendi-leaves.jpg`,
    alt: "Bold leafy mehendi patterns across a palm with darkly stained fingertips.",
    source: "https://www.instagram.com/____tiny_apocalypse/p/CqBDcViJmKV/",
  },
  {
    title: "A little closer to nature",
    description: "A detail from the botanical mehendi series",
    image: `${import.meta.env.BASE_URL}images/mehendi-leaves-detail.jpg`,
    alt: "A hand decorated with botanical mehendi beside white flowers in a terracotta pot.",
    source: "https://www.instagram.com/____tiny_apocalypse/p/CqBDcViJmKV/",
  },
];
const dialog = document.querySelector<HTMLDialogElement>(".art-dialog")!;
const dialogImage = document.querySelector<HTMLImageElement>("#dialog-image")!;
let artworkIndex = 0;
let artworkTrigger: HTMLElement | null = null;

function showArtwork(index: number) {
  artworkIndex = (index + artworks.length) % artworks.length;
  const artwork = artworks[artworkIndex];
  dialogImage.src = artwork.image;
  dialogImage.alt = artwork.alt;
  document.querySelector("#art-dialog-title")!.textContent = artwork.title;
  document.querySelector("#art-dialog-description")!.textContent =
    artwork.description;
  document.querySelector("#art-position")!.textContent =
    `${String(artworkIndex + 1).padStart(2, "0")} / 03`;
  document.querySelector<HTMLAnchorElement>("#art-source")!.href =
    artwork.source;
}

document
  .querySelectorAll<HTMLButtonElement>("[data-artwork]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      artworkTrigger = button;
      showArtwork(Number(button.dataset.artwork));
      dialog.showModal();
      document.body.classList.add("dialog-open");
    }),
  );
document
  .querySelector(".close-dialog")!
  .addEventListener("click", () => dialog.close());
document
  .querySelector(".previous-art")!
  .addEventListener("click", () => showArtwork(artworkIndex - 1));
document
  .querySelector(".next-art")!
  .addEventListener("click", () => showArtwork(artworkIndex + 1));
dialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    dialog.close();
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showArtwork(artworkIndex + 1);
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showArtwork(artworkIndex - 1);
  }
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  }
});
dialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  artworkTrigger?.focus();
});

document.querySelector("#year")!.textContent = String(new Date().getFullYear());
