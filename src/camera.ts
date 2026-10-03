import { decodeImageData } from "./qr";

let stream: MediaStream | null = null;
let timer = 0;

export function stopCamera(): void {
  if (timer) cancelAnimationFrame(timer);
  timer = 0;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
}

export async function startCamera(
  video: HTMLVideoElement,
  onCode: (text: string) => void,
  onError: (message: string) => void,
): Promise<void> {
  stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  } catch {
    onError("Camera blocked. Choose a photo of the code instead.");
    return;
  }
  video.srcObject = stream;
  await video.play();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    onError("This browser cannot read the camera frame.");
    stopCamera();
    return;
  }
  const tick = () => {
    if (!stream) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      const frame = ctx.getImageData(0, 0, width, height);
      const text = decodeImageData(frame.data, width, height);
      if (text) {
        stopCamera();
        onCode(text);
        return;
      }
    }
    timer = requestAnimationFrame(tick);
  };
  timer = requestAnimationFrame(tick);
}
