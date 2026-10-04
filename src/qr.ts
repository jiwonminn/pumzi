import type { PDFPageProxy } from "pdfjs-dist";
import QRCode from "qrcode";
import jsQR from "jsqr";

export function toQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
  });
}

export function decodeImageData(data: Uint8ClampedArray, width: number, height: number): string | null {
  const code = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return code?.data ?? null;
}

export async function decodeDataUrl(dataUrl: string): Promise<string | null> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeImageData(frame.data, frame.width, frame.height);
}

export async function decodeBlob(blob: Blob): Promise<string | null> {
  if (await isPdf(blob)) return decodePdf(blob);
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeImageData(frame.data, frame.width, frame.height);
}

async function isPdf(blob: Blob): Promise<boolean> {
  if (blob.type === "application/pdf") return true;
  if (blob instanceof File && blob.name.toLowerCase().endsWith(".pdf")) return true;
  if (blob.type.startsWith("image/")) return false;
  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  return header.length === 5 && String.fromCharCode(...header) === "%PDF-";
}

async function decodePdf(blob: Blob): Promise<string | null> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  const data = new Uint8Array(await blob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data, useWasm: false });
  try {
    const pdf = await loadingTask.promise;
    const pages = Math.min(pdf.numPages, 8);
    for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const text = await decodePdfPage(page);
      page.cleanup();
      if (text) return text;
    }
    return null;
  } finally {
    await loadingTask.destroy();
  }
}

async function decodePdfPage(page: PDFPageProxy): Promise<string | null> {
  const base = page.getViewport({ scale: 1 });
  const longest = Math.max(base.width, base.height);
  const scale = Math.min(4, Math.max(2, 2200 / longest));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport, background: "rgb(255,255,255)" }).promise;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeImageData(frame.data, frame.width, frame.height);
}
