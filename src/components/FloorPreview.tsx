"use client";

import { useEffect, useRef, useCallback } from "react";

interface FloorPreviewProps {
  originalImage: string;
  floorMask: string | null; // Base64 PNG mask (white = floor)
  textureUrl: string;
  onResult: (base64: string) => void;
  onError: (message: string) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

/**
 * Create a fallback mask: bottom 45% of image is white (floor),
 * with a gradient transition.
 */
function createFallbackMask(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  // Gradient from black (top) to white (bottom)
  const gradTop = h * 0.45;
  const gradBot = h * 0.6;
  const grad = ctx.createLinearGradient(0, gradTop, 0, gradBot);
  grad.addColorStop(0, "black");
  grad.addColorStop(1, "white");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = grad;
  ctx.fillRect(0, gradTop, w, gradBot - gradTop);
  ctx.fillStyle = "white";
  ctx.fillRect(0, gradBot, w, h - gradBot);
  return c;
}

export default function FloorPreview({
  originalImage,
  floorMask,
  textureUrl,
  onResult,
  onError,
}: FloorPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasRendered = useRef(false);

  const render = useCallback(async () => {
    if (hasRendered.current) return;
    hasRendered.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // 1. Load room image
      const roomImg = await loadImage(originalImage);
      const W = roomImg.naturalWidth;
      const H = roomImg.naturalHeight;
      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d")!;

      // 2. Draw original room
      ctx.drawImage(roomImg, 0, 0, W, H);

      // 3. Load or create mask
      let maskCanvas: HTMLCanvasElement;
      if (floorMask) {
        const maskImg = await loadImage(floorMask);
        maskCanvas = document.createElement("canvas");
        maskCanvas.width = W;
        maskCanvas.height = H;
        const mctx = maskCanvas.getContext("2d")!;
        mctx.drawImage(maskImg, 0, 0, W, H);
      } else {
        maskCanvas = createFallbackMask(W, H);
      }

      // 4. Load texture
      let texImg: HTMLImageElement;
      try {
        texImg = await loadImage(textureUrl);
      } catch {
        // Fallback: wood color
        const fc = document.createElement("canvas");
        fc.width = 256;
        fc.height = 256;
        const fctx = fc.getContext("2d")!;
        fctx.fillStyle = "#b48c5a";
        fctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 256; i += 14) {
          fctx.strokeStyle = `rgba(140,100,50,0.3)`;
          fctx.beginPath();
          fctx.moveTo(0, i);
          fctx.lineTo(256, i);
          fctx.stroke();
        }
        texImg = await loadImage(fc.toDataURL());
      }

      // 5. Create tiled texture canvas
      const texCanvas = document.createElement("canvas");
      texCanvas.width = W;
      texCanvas.height = H;
      const tctx = texCanvas.getContext("2d")!;
      const pattern = tctx.createPattern(texImg, "repeat")!;
      tctx.fillStyle = pattern;
      tctx.fillRect(0, 0, W, H);

      // 6. Apply lighting from original image (multiply blend)
      // Extract grayscale of original for lighting
      const lightCanvas = document.createElement("canvas");
      lightCanvas.width = W;
      lightCanvas.height = H;
      const lctx = lightCanvas.getContext("2d")!;
      lctx.drawImage(roomImg, 0, 0, W, H);
      // Convert to grayscale and normalize
      const lightData = lctx.getImageData(0, 0, W, H);
      const ld = lightData.data;
      let brightSum = 0;
      let brightCount = 0;
      // Sample brightness from mask area
      const maskData = maskCanvas.getContext("2d")!.getImageData(0, 0, W, H).data;
      for (let i = 0; i < ld.length; i += 4) {
        const maskVal = maskData[i]; // R channel of mask (grayscale)
        if (maskVal > 128) {
          brightSum += (ld[i] + ld[i + 1] + ld[i + 2]) / 3;
          brightCount++;
        }
      }
      const avgBright = brightCount > 0 ? brightSum / brightCount : 128;

      // Normalize: make average brightness = 180 (slightly bright for multiply)
      const normTarget = 180;
      for (let i = 0; i < ld.length; i += 4) {
        const gray = (ld[i] + ld[i + 1] + ld[i + 2]) / 3;
        const normalized = Math.min(255, Math.round((gray / avgBright) * normTarget));
        ld[i] = normalized;
        ld[i + 1] = normalized;
        ld[i + 2] = normalized;
        ld[i + 3] = 255;
      }
      lctx.putImageData(lightData, 0, 0);

      // Apply lighting to texture via multiply
      tctx.globalCompositeOperation = "multiply";
      tctx.drawImage(lightCanvas, 0, 0);
      tctx.globalCompositeOperation = "source-over";

      // 7. Apply mask: keep texture only where mask is white
      tctx.globalCompositeOperation = "destination-in";
      tctx.drawImage(maskCanvas, 0, 0);
      tctx.globalCompositeOperation = "source-over";

      // 8. Composite: original + masked lit texture at 80% opacity
      ctx.globalAlpha = 0.80;
      ctx.drawImage(texCanvas, 0, 0);
      ctx.globalAlpha = 1.0;

      // 9. Export
      const result = canvas.toDataURL("image/jpeg", 0.92);
      onResult(result);
    } catch (err) {
      console.error("FloorPreview error:", err);
      onError("Vorschau konnte nicht erstellt werden.");
    }
  }, [originalImage, floorMask, textureUrl, onResult, onError]);

  useEffect(() => {
    hasRendered.current = false;
    render();
  }, [render]);

  return <canvas ref={canvasRef} className="hidden" />;
}
