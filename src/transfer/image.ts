import type { TransferSettings } from "./settings";

export interface CompressedImage {
  bytes: Uint8Array;
  name: string;
  mime: "image/jpeg";
  originalBytes: number;
  width: number;
  height: number;
}

export async function compressImageFile(file: File, settings: TransferSettings): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo file.");
  }

  const image = await loadImage(file);
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, settings.imageMaxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("This browser could not prepare the photo canvas.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, "image/jpeg", settings.jpegQuality);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  return {
    bytes,
    name: jpegName(file.name),
    mime: "image/jpeg",
    originalBytes: file.size,
    width,
    height
  };
}

function fitWithin(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Photon could not read that photo."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: "image/jpeg", quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Photon could not compress that photo."));
      },
      mime,
      quality,
    );
  });
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photon-photo";
  return `${base}.jpg`;
}
