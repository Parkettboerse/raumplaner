"use client";

import { useEffect, useRef, useCallback } from "react";

interface Corner {
  x: number;
  y: number;
}

interface FloorPreviewProps {
  originalImage: string;
  corners: Corner[];
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

export default function FloorPreview({
  originalImage,
  corners,
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

      // 3. Load texture
      let texImg: HTMLImageElement;
      try {
        texImg = await loadImage(textureUrl);
      } catch {
        // Fallback: simple wood color
        const fc = document.createElement("canvas");
        fc.width = 128;
        fc.height = 128;
        const fctx = fc.getContext("2d")!;
        fctx.fillStyle = "#b48c5a";
        fctx.fillRect(0, 0, 128, 128);
        texImg = await loadImage(fc.toDataURL());
      }

      // 4. Convert corner percentages to pixels
      const pts = corners.map((c) => ({
        x: (c.x / 100) * W,
        y: (c.y / 100) * H,
      }));

      // 5. Create texture pattern
      const pattern = ctx.createPattern(texImg, "repeat");
      if (!pattern) throw new Error("Pattern creation failed");

      // 6. Clip to floor polygon and fill with texture at 75% opacity
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.clip();

      ctx.globalAlpha = 0.75;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1.0;
      ctx.restore();

      // 7. Export
      const result = canvas.toDataURL("image/jpeg", 0.92);
      onResult(result);
    } catch (err) {
      console.error("FloorPreview error:", err);
      onError("Vorschau konnte nicht erstellt werden.");
    }
  }, [originalImage, corners, textureUrl, onResult, onError]);

  useEffect(() => {
    hasRendered.current = false;
    render();
  }, [render]);

  return <canvas ref={canvasRef} className="hidden" />;
}
