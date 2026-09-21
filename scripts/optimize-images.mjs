import sharp from "sharp";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { resolve } from "node:path";
import { readFile, stat, writeFile } from "node:fs/promises";

prepareZXingModule({
  overrides: {
    wasmBinary: new Uint8Array(
      await readFile(
        resolve(
          "node_modules",
          "zxing-wasm",
          "dist",
          "reader",
          "zxing_reader.wasm",
        ),
      ),
    ).buffer,
  },
});
const qrSource = await sharp(resolve("scripts", "insta-QR.jpg"))
  .extract({ left: 210, top: 407, width: 660, height: 660 })
  .png()
  .toBuffer();
const qrCodes = await readBarcodes(qrSource, {
  formats: ["QRCode"],
  tryHarder: true,
});
const qrDestination = qrCodes[0] ? new URL(qrCodes[0].text) : null;
if (
  !qrDestination ||
  qrDestination.protocol !== "https:" ||
  !["instagram.com", "www.instagram.com"].includes(qrDestination.hostname) ||
  !/^\/iofshapes\/?$/i.test(qrDestination.pathname)
) {
  throw new Error(
    `The supplied QR must decode to the Iofshapes Instagram profile; decoded: ${qrDestination?.href ?? "no readable QR found"}`,
  );
}
await writeFile(resolve("public", "images", "instagram-qr.png"), qrSource);
console.log(
  `Instagram QR verified: ${qrDestination.origin}${qrDestination.pathname}`,
);

const images = [
  { name: "CanvasArt", widths: [360, 720] },
  { name: "mehendi-leaves", widths: [360, 720, 1200] },
  { name: "mehendi-leaves-detail", widths: [360, 720, 1200] },
];

const { data: handPixels, info: handInfo } = await sharp(
  resolve("scripts", "drawing-hand.jpg"),
)
  .rotate()
  .toColourspace("srgb")
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let offset = 0; offset < handPixels.length; offset += 4) {
  const warmth = handPixels[offset] - handPixels[offset + 2];
  const opacity = Math.max(0, Math.min(1, (warmth - 20) / 25));
  if (opacity > 0 && opacity < 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      handPixels[offset + channel] = Math.max(
        0,
        Math.min(
          255,
          (handPixels[offset + channel] - 220 * (1 - opacity)) / opacity,
        ),
      );
    }
  }
  const pixel = offset / 4;
  const horizontal = (pixel % handInfo.width) / (handInfo.width - 1);
  const vertical = Math.floor(pixel / handInfo.width) / (handInfo.height - 1);
  const wristProgress = Math.max(
    0,
    Math.min(1, (horizontal * 0.8 + vertical * 0.2 - 0.64) / 0.2),
  );
  const wristOpacity =
    1 - wristProgress * wristProgress * (3 - 2 * wristProgress);
  handPixels[offset + 3] = Math.round(255 * opacity * wristOpacity);
}

const handSource = await sharp(handPixels, { raw: handInfo }).png().toBuffer();
const handArtwork = await sharp(handSource)
  .resize({ width: 224 })
  .png({ compressionLevel: 9 })
  .toBuffer();
const handHeight = Math.round((112 * handInfo.height) / handInfo.width);
const handSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="${handHeight}" viewBox="0 0 ${handInfo.width} ${handInfo.height}">
  <image width="${handInfo.width}" height="${handInfo.height}" href="data:image/png;base64,${handArtwork.toString("base64")}"/>
</svg>\n`;
await writeFile(resolve("public", "images", "drawing-hand.svg"), handSvg);
await sharp(handSource)
  .resize({ width: 112 })
  .png()
  .toFile(resolve("public", "images", "drawing-hand.png"));
await sharp(handSource)
  .resize({ width: 224 })
  .png()
  .toFile(resolve("public", "images", "drawing-hand@2x.png"));
console.log(
  `Drawing hand: 112x${handHeight}, SVG ${(Buffer.byteLength(handSvg) / 1024).toFixed(1)} KB`,
);

for (const [size, filename] of [
  [32, "favicon-32.png"],
  [180, "apple-touch-icon.png"],
]) {
  await sharp(resolve("public", "favicon.svg"))
    .resize(size, size)
    .png()
    .toFile(resolve("public", filename));
}

for (const image of images) {
  const original = resolve("public", "images", `${image.name}.jpg`);
  for (const width of image.widths) {
    const output = resolve("public", "images", `${image.name}-${width}.webp`);
    await sharp(original)
      .rotate()
      .resize({ width })
      .webp({ quality: 82, effort: 6 })
      .toFile(output);
    const result = await stat(output);
    console.log(
      `${image.name}-${width}.webp: ${(result.size / 1024).toFixed(1)} KB`,
    );
  }
}
