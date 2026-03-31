"use client";

import { useEffect, useRef, useCallback } from "react";

interface FloorPoint {
  x: number;
  y: number;
}

interface FloorPreviewProps {
  originalImage: string;
  floorPoints: FloorPoint[];
  textureUrl: string;
  onResult: (base64: string) => void;
  onError: (message: string) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export default function FloorPreview({
  originalImage,
  floorPoints,
  textureUrl,
  onResult,
  onError,
}: FloorPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendered = useRef(false);

  const render = useCallback(async () => {
    if (rendered.current) return;
    rendered.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // 1. Load original image
      const roomImg = await loadImage(originalImage);
      const w = roomImg.naturalWidth;
      const h = roomImg.naturalHeight;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // 2. Draw original room photo
      ctx.drawImage(roomImg, 0, 0, w, h);

      // 3. Build floor polygon path (convert % to px)
      const absPoints = floorPoints.map((p) => ({
        x: (p.x / 100) * w,
        y: (p.y / 100) * h,
      }));

      // 4. Load texture image
      let textureImg: HTMLImageElement;
      try {
        textureImg = await loadImage(textureUrl);
      } catch {
        // Fallback: create a solid wood-color texture
        const fallback = document.createElement("canvas");
        fallback.width = 256;
        fallback.height = 256;
        const fCtx = fallback.getContext("2d")!;
        fCtx.fillStyle = "#b48c5a";
        fCtx.fillRect(0, 0, 256, 256);
        // Add some grain lines for realism
        fCtx.strokeStyle = "#a07840";
        fCtx.lineWidth = 1;
        for (let i = 0; i < 256; i += 12) {
          fCtx.beginPath();
          fCtx.moveTo(0, i + Math.random() * 4);
          fCtx.lineTo(256, i + Math.random() * 4);
          fCtx.stroke();
        }
        textureImg = await loadImage(fallback.toDataURL());
      }

      // 5. Create tiled texture pattern
      const patternCanvas = document.createElement("canvas");
      const tileW = 256;
      const tileH = Math.round(
        (textureImg.naturalHeight / textureImg.naturalWidth) * tileW
      );
      patternCanvas.width = tileW;
      patternCanvas.height = tileH;
      const pCtx = patternCanvas.getContext("2d")!;
      pCtx.drawImage(textureImg, 0, 0, tileW, tileH);

      const pattern = ctx.createPattern(patternCanvas, "repeat");
      if (!pattern) throw new Error("Pattern creation failed");

      // 6. Clip to floor polygon and fill with texture
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(absPoints[0].x, absPoints[0].y);
      for (let i = 1; i < absPoints.length; i++) {
        ctx.lineTo(absPoints[i].x, absPoints[i].y);
      }
      ctx.closePath();
      ctx.clip();

      // 7. Draw texture with reduced opacity (shadows show through)
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1.0;
      ctx.restore();

      // 8. Export result
      const result = canvas.toDataURL("image/jpeg", 0.9);
      onResult(result);
    } catch (err) {
      console.error("FloorPreview render error:", err);
      onError("Vorschau konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
    }
  }, [originalImage, floorPoints, textureUrl, onResult, onError]);

  useEffect(() => {
    rendered.current = false;
    render();
  }, [render]);

  return <canvas ref={canvasRef} className="hidden" />;
}
