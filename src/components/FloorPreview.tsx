"use client";

import { useEffect, useRef, useCallback } from "react";

interface Corner {
  x: number;
  y: number;
}

interface FloorPreviewProps {
  originalImage: string;
  floorCorners: Corner[];
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

/** Bilinear interpolation between 4 corner points */
function bilinear(
  tl: { x: number; y: number },
  tr: { x: number; y: number },
  br: { x: number; y: number },
  bl: { x: number; y: number },
  u: number,
  v: number
): { x: number; y: number } {
  const top = { x: tl.x + (tr.x - tl.x) * u, y: tl.y + (tr.y - tl.y) * u };
  const bot = { x: bl.x + (br.x - bl.x) * u, y: bl.y + (br.y - bl.y) * u };
  return { x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v };
}

/**
 * Draw a textured triangle on a canvas using affine transform.
 * Maps texture triangle (t0,t1,t2) onto destination triangle (d0,d1,d2).
 */
function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  texImg: HTMLCanvasElement,
  tw: number,
  th: number,
  // Texture coords
  t0x: number, t0y: number,
  t1x: number, t1y: number,
  t2x: number, t2y: number,
  // Destination coords
  d0x: number, d0y: number,
  d1x: number, d1y: number,
  d2x: number, d2y: number
) {
  ctx.save();

  // Clip to destination triangle
  ctx.beginPath();
  ctx.moveTo(d0x, d0y);
  ctx.lineTo(d1x, d1y);
  ctx.lineTo(d2x, d2y);
  ctx.closePath();
  ctx.clip();

  // Solve affine transform: texture space → canvas space
  // [d0x]   [a c e] [t0x]
  // [d0y] = [b d f] [t0y]
  // [1  ]   [0 0 1] [1  ]
  const denom =
    t0x * (t1y - t2y) - t1x * (t0y - t2y) + t2x * (t0y - t1y);

  if (Math.abs(denom) < 0.001) {
    ctx.restore();
    return;
  }

  const a =
    (d0x * (t1y - t2y) - d1x * (t0y - t2y) + d2x * (t0y - t1y)) / denom;
  const b =
    (d0y * (t1y - t2y) - d1y * (t0y - t2y) + d2y * (t0y - t1y)) / denom;
  const c =
    (d0x * (t2x - t1x) - d1x * (t2x - t0x) + d2x * (t1x - t0x)) / denom;
  const d =
    (d0y * (t2x - t1x) - d1y * (t2x - t0x) + d2y * (t1x - t0x)) / denom;
  const e =
    (d0x * (t1x * t2y - t2x * t1y) -
      d1x * (t0x * t2y - t2x * t0y) +
      d2x * (t0x * t1y - t1x * t0y)) / denom;
  const f =
    (d0y * (t1x * t2y - t2x * t1y) -
      d1y * (t0x * t2y - t2x * t0y) +
      d2y * (t0x * t1y - t1x * t0y)) / denom;

  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(texImg, 0, 0);
  ctx.restore();
}

export default function FloorPreview({
  originalImage,
  floorCorners,
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

      // 3. Convert corner percentages to pixels
      //    Order: TL, TR, BR, BL of floor quad
      const [tl, tr, br, bl] = floorCorners.map((c) => ({
        x: (c.x / 100) * W,
        y: (c.y / 100) * H,
      }));

      // 4. Load texture
      let texImg: HTMLImageElement;
      try {
        texImg = await loadImage(textureUrl);
      } catch {
        // Generate fallback texture
        const fc = document.createElement("canvas");
        fc.width = 256;
        fc.height = 256;
        const fctx = fc.getContext("2d")!;
        fctx.fillStyle = "#b48c5a";
        fctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 256; i += 16) {
          fctx.strokeStyle = `rgba(140,100,50,${0.3 + Math.random() * 0.2})`;
          fctx.lineWidth = 1;
          fctx.beginPath();
          fctx.moveTo(0, i);
          fctx.lineTo(256, i + Math.random() * 6 - 3);
          fctx.stroke();
        }
        texImg = await loadImage(fc.toDataURL());
      }

      // 5. Create tiled texture canvas (big enough to cover the floor)
      const tileW = 256;
      const tileH = Math.round((texImg.naturalHeight / texImg.naturalWidth) * tileW) || 256;
      const tilesX = Math.ceil(W / tileW) + 1;
      const tilesY = Math.ceil(H / tileH) + 1;
      const texCanvas = document.createElement("canvas");
      texCanvas.width = tilesX * tileW;
      texCanvas.height = tilesY * tileH;
      const texCtx = texCanvas.getContext("2d")!;
      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          texCtx.drawImage(texImg, tx * tileW, ty * tileH, tileW, tileH);
        }
      }

      // 6. Extract original floor brightness for lighting
      const floorCanvas = document.createElement("canvas");
      floorCanvas.width = W;
      floorCanvas.height = H;
      const floorCtx = floorCanvas.getContext("2d")!;
      floorCtx.drawImage(roomImg, 0, 0, W, H);
      const originalData = floorCtx.getImageData(0, 0, W, H);

      // 7. Render texture onto floor using perspective triangle mesh
      const GRID = 20;
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = W;
      resultCanvas.height = H;
      const rctx = resultCanvas.getContext("2d")!;

      const TW = texCanvas.width;
      const TH = texCanvas.height;

      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const u0 = col / GRID;
          const v0 = row / GRID;
          const u1 = (col + 1) / GRID;
          const v1 = (row + 1) / GRID;

          // Destination quad corners (perspective-interpolated)
          const p00 = bilinear(tl, tr, br, bl, u0, v0);
          const p10 = bilinear(tl, tr, br, bl, u1, v0);
          const p01 = bilinear(tl, tr, br, bl, u0, v1);
          const p11 = bilinear(tl, tr, br, bl, u1, v1);

          // Texture coords
          const tx0 = u0 * TW;
          const ty0 = v0 * TH;
          const tx1 = u1 * TW;
          const ty1 = v1 * TH;

          // Triangle 1: top-left
          drawTexturedTriangle(
            rctx, texCanvas, TW, TH,
            tx0, ty0, tx1, ty0, tx0, ty1,
            p00.x, p00.y, p10.x, p10.y, p01.x, p01.y
          );
          // Triangle 2: bottom-right
          drawTexturedTriangle(
            rctx, texCanvas, TW, TH,
            tx1, ty0, tx1, ty1, tx0, ty1,
            p10.x, p10.y, p11.x, p11.y, p01.x, p01.y
          );
        }
      }

      // 8. Apply lighting from original image
      const texData = rctx.getImageData(0, 0, W, H);
      const texPixels = texData.data;
      const origPixels = originalData.data;

      // Calculate average brightness in floor area for normalization
      let brightSum = 0;
      let brightCount = 0;
      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const p = bilinear(tl, tr, br, bl, (col + 0.5) / GRID, (row + 0.5) / GRID);
          const px = Math.round(p.x);
          const py = Math.round(p.y);
          if (px >= 0 && px < W && py >= 0 && py < H) {
            const idx = (py * W + px) * 4;
            brightSum += (origPixels[idx] + origPixels[idx + 1] + origPixels[idx + 2]) / 3;
            brightCount++;
          }
        }
      }
      const avgBright = brightCount > 0 ? brightSum / brightCount : 128;

      // Multiply texture by normalized original brightness
      for (let i = 0; i < texPixels.length; i += 4) {
        if (texPixels[i + 3] === 0) continue; // skip transparent
        const idx = i;
        const origBright =
          (origPixels[idx] + origPixels[idx + 1] + origPixels[idx + 2]) / 3;
        const factor = avgBright > 0 ? origBright / avgBright : 1;
        const clamped = Math.min(1.4, Math.max(0.4, factor)); // clamp to avoid extremes

        texPixels[i] = Math.min(255, Math.round(texPixels[i] * clamped));
        texPixels[i + 1] = Math.min(255, Math.round(texPixels[i + 1] * clamped));
        texPixels[i + 2] = Math.min(255, Math.round(texPixels[i + 2] * clamped));
      }
      rctx.putImageData(texData, 0, 0);

      // 9. Composite: original + textured floor at 80% opacity
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = 0.80;
      ctx.drawImage(resultCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
      ctx.restore();

      // 10. Export
      const result = canvas.toDataURL("image/jpeg", 0.92);
      onResult(result);
    } catch (err) {
      console.error("FloorPreview error:", err);
      onError("Vorschau konnte nicht erstellt werden.");
    }
  }, [originalImage, floorCorners, textureUrl, onResult, onError]);

  useEffect(() => {
    hasRendered.current = false;
    render();
  }, [render]);

  return <canvas ref={canvasRef} className="hidden" />;
}
