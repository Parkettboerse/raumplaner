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

const TILE_SIZE = 150; // px per texture tile — good balance of detail and repeat

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for external URLs (Blob Storage etc.)
    // Same-origin paths (e.g. /textures/...) don't need it and it can cause issues
    if (src.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

function createFallbackTexture(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#b48c5a";
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Wood grain lines
  ctx.strokeStyle = "#a07840";
  ctx.lineWidth = 1;
  for (let y = 0; y < TILE_SIZE; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 3);
    ctx.lineTo(TILE_SIZE, y + Math.random() * 3);
    ctx.stroke();
  }
  // Plank gaps
  ctx.strokeStyle = "#8a6830";
  ctx.lineWidth = 2;
  for (let x = 0; x < TILE_SIZE; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TILE_SIZE);
    ctx.stroke();
  }
  return c;
}

/**
 * Resize a loaded image to a consistent tile size for repeating.
 */
function createTile(img: HTMLImageElement): HTMLCanvasElement {
  const aspect = img.naturalHeight / img.naturalWidth;
  const tileW = TILE_SIZE;
  const tileH = Math.round(TILE_SIZE * aspect);

  const c = document.createElement("canvas");
  c.width = tileW;
  c.height = tileH;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, tileW, tileH);
  return c;
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

    console.log("[FloorPreview] Rendering with texture:", textureUrl?.slice(0, 80) || "(empty)");

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

      // 3. Load texture and create tile
      let tileCanvas: HTMLCanvasElement;
      if (textureUrl && textureUrl.trim() !== "") {
        try {
          const texImg = await loadImage(textureUrl);
          tileCanvas = createTile(texImg);
          console.log("[FloorPreview] Texture loaded, tile:", tileCanvas.width, "x", tileCanvas.height);
        } catch (err) {
          console.warn("[FloorPreview] Texture load failed, using fallback:", err);
          tileCanvas = createFallbackTexture();
        }
      } else {
        console.log("[FloorPreview] No texture URL, using fallback");
        tileCanvas = createFallbackTexture();
      }

      // 4. Convert corner percentages to pixels
      const pts = corners.map((c) => ({
        x: (c.x / 100) * W,
        y: (c.y / 100) * H,
      }));

      // 5. Create repeating pattern from tile
      const pattern = ctx.createPattern(tileCanvas, "repeat");
      if (!pattern) throw new Error("Pattern creation failed");

      // 6. Clip to floor polygon and fill with tiled texture
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
      console.error("[FloorPreview] Error:", err);
      onError("Vorschau konnte nicht erstellt werden.");
    }
  }, [originalImage, corners, textureUrl, onResult, onError]);

  useEffect(() => {
    hasRendered.current = false;
    render();
  }, [render]);

  return <canvas ref={canvasRef} className="hidden" />;
}
