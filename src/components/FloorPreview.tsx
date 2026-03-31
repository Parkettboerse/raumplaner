"use client";

import { useEffect, useRef, useCallback } from "react";

interface Corner { x: number; y: number }

interface FloorPreviewProps {
  originalImage: string;
  corners: Corner[];
  textureUrl: string;
  onResult: (base64: string) => void;
  onError: (msg: string) => void;
}

const TILE_SIZE = 120;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
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
  const rendered = useRef(false);

  const render = useCallback(async () => {
    if (rendered.current) return;
    rendered.current = true;

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

      // 3. Load texture and scale to tile size
      let tileCanvas: HTMLCanvasElement;
      try {
        const texImg = await loadImage(textureUrl);
        const aspect = texImg.naturalHeight / texImg.naturalWidth;
        tileCanvas = document.createElement("canvas");
        tileCanvas.width = TILE_SIZE;
        tileCanvas.height = Math.round(TILE_SIZE * aspect) || TILE_SIZE;
        tileCanvas.getContext("2d")!.drawImage(texImg, 0, 0, tileCanvas.width, tileCanvas.height);
      } catch {
        // Fallback wood texture
        tileCanvas = document.createElement("canvas");
        tileCanvas.width = TILE_SIZE;
        tileCanvas.height = TILE_SIZE;
        const tc = tileCanvas.getContext("2d")!;
        tc.fillStyle = "#b48c5a";
        tc.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        tc.strokeStyle = "#a07840";
        for (let y = 0; y < TILE_SIZE; y += 14) {
          tc.beginPath();
          tc.moveTo(0, y);
          tc.lineTo(TILE_SIZE, y + Math.random() * 3);
          tc.stroke();
        }
      }

      // 4. Convert corners from % to px
      const pts = corners.map((c) => ({
        x: (c.x / 100) * W,
        y: (c.y / 100) * H,
      }));

      // Helper: clip to floor polygon
      const clipFloor = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.clip();
      };

      // 5. Draw tiled texture into floor polygon
      const pattern = ctx.createPattern(tileCanvas, "repeat");
      if (!pattern) throw new Error("Pattern failed");

      ctx.save();
      clipFloor();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // 6. Create grayscale version of original for lighting
      const grayCanvas = document.createElement("canvas");
      grayCanvas.width = W;
      grayCanvas.height = H;
      const gctx = grayCanvas.getContext("2d")!;
      gctx.drawImage(roomImg, 0, 0, W, H);
      const imgData = gctx.getImageData(0, 0, W, H);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      }
      gctx.putImageData(imgData, 0, 0);

      // 7. Apply grayscale as multiply over the textured floor
      ctx.save();
      clipFloor();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(grayCanvas, 0, 0);
      ctx.restore();

      // 8. Export
      onResult(canvas.toDataURL("image/jpeg", 0.9));
    } catch (err) {
      console.error("[FloorPreview]", err);
      onError("Vorschau konnte nicht erstellt werden.");
    }
  }, [originalImage, corners, textureUrl, onResult, onError]);

  useEffect(() => {
    rendered.current = false;
    render();
  }, [render]);

  return <canvas ref={canvasRef} className="hidden" />;
}
