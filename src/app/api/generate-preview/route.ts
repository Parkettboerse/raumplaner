import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/products";
import { createFloorMask } from "@/lib/createMask";
import sharp from "sharp";

export const maxDuration = 30;

interface FloorPoint {
  x: number;
  y: number;
}

const FALLBACK_POLYGON: FloorPoint[] = [
  { x: 0, y: 55 },
  { x: 100, y: 55 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

/**
 * Tile a texture to fill the given dimensions.
 * Returns a raw PNG buffer.
 */
async function tileTexture(
  textureBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  // Get texture dimensions
  const meta = await sharp(textureBuffer).metadata();
  const tw = meta.width || 256;
  const th = meta.height || 256;

  // Resize texture tile to a reasonable size (256px wide, keep aspect)
  const tileSize = 256;
  const tile = await sharp(textureBuffer)
    .resize(tileSize, Math.round((th / tw) * tileSize))
    .png()
    .toBuffer();

  const tileMeta = await sharp(tile).metadata();
  const tileW = tileMeta.width!;
  const tileH = tileMeta.height!;

  // Calculate how many tiles we need
  const cols = Math.ceil(width / tileW);
  const rows = Math.ceil(height / tileH);

  // Create a composite array of tiles
  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      composites.push({
        input: tile,
        left: col * tileW,
        top: row * tileH,
      });
    }
  }

  // Create base image and composite all tiles
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

/**
 * Fetch a texture image from a URL.
 * Returns the raw buffer.
 */
async function fetchTexture(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch texture: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: NextRequest) {
  let body: {
    roomImage?: string;
    floorId?: string;
    floorPoints?: FloorPoint[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const { roomImage, floorId, floorPoints } = body;

  if (!roomImage || !floorId) {
    return NextResponse.json(
      { error: "roomImage und floorId sind erforderlich" },
      { status: 400 }
    );
  }

  const product = getProductById(floorId);
  if (!product) {
    return NextResponse.json(
      { error: "Produkt nicht gefunden" },
      { status: 404 }
    );
  }

  try {
    const base64Data = roomImage.includes(",")
      ? roomImage.split(",")[1]
      : roomImage;

    const imageBuffer = Buffer.from(base64Data, "base64");

    // Get original image dimensions
    const originalMeta = await sharp(imageBuffer).metadata();
    const width = originalMeta.width || 1024;
    const height = originalMeta.height || 1024;

    // Ensure original is PNG for compositing
    const originalPng = await sharp(imageBuffer).png().toBuffer();

    const polygon =
      floorPoints && floorPoints.length >= 3 ? floorPoints : FALLBACK_POLYGON;

    // Create floor mask (white = floor, black = keep)
    const maskPng = await createFloorMask(polygon, width, height);

    // Get texture: from product URL or generate a colored placeholder
    let tiledTexture: Buffer;

    if (product.texture_url) {
      try {
        const textureRaw = await fetchTexture(product.texture_url);
        tiledTexture = await tileTexture(textureRaw, width, height);
      } catch {
        // Fallback: solid color based on category
        const colors: Record<string, { r: number; g: number; b: number }> = {
          parkett: { r: 180, g: 140, b: 90 },
          vinyl: { r: 160, g: 155, b: 145 },
          laminat: { r: 190, g: 165, b: 120 },
          kork: { r: 195, g: 165, b: 110 },
        };
        const color = colors[product.category] || colors.parkett;
        tiledTexture = await sharp({
          create: { width, height, channels: 3, background: color },
        })
          .png()
          .toBuffer();
      }
    } else {
      // No texture URL: use a category-based solid color
      const colors: Record<string, { r: number; g: number; b: number }> = {
        parkett: { r: 180, g: 140, b: 90 },
        vinyl: { r: 160, g: 155, b: 145 },
        laminat: { r: 190, g: 165, b: 120 },
        kork: { r: 195, g: 165, b: 110 },
      };
      const color = colors[product.category] || colors.parkett;
      tiledTexture = await sharp({
        create: { width, height, channels: 3, background: color },
      })
        .png()
        .toBuffer();
    }

    // Apply mask to texture: texture pixels where mask is white, transparent elsewhere
    // Step 1: Extract mask as raw grayscale for alpha channel
    const maskRaw = await sharp(maskPng)
      .resize(width, height)
      .grayscale()
      .raw()
      .toBuffer();

    // Step 2: Get tiled texture as raw RGBA
    const textureRgba = await sharp(tiledTexture)
      .resize(width, height)
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Step 3: Set alpha from mask, multiply by 0.85 for natural blending (shadows show through)
    const maskedPixels = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      maskedPixels[i * 4] = textureRgba[i * 4];         // R
      maskedPixels[i * 4 + 1] = textureRgba[i * 4 + 1]; // G
      maskedPixels[i * 4 + 2] = textureRgba[i * 4 + 2]; // B
      // Alpha = mask value * 0.85 (let shadows through)
      maskedPixels[i * 4 + 3] = Math.round(maskRaw[i] * 0.85);
    }

    const maskedTexturePng = await sharp(maskedPixels, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();

    // Step 4: Composite masked texture over original
    const result = await sharp(originalPng)
      .composite([{ input: maskedTexturePng, blend: "over" }])
      .jpeg({ quality: 85 })
      .toBuffer();

    const resultBase64 = `data:image/jpeg;base64,${result.toString("base64")}`;

    return NextResponse.json({ resultImage: resultBase64 });
  } catch (err) {
    console.error("Generate preview error:", err);
    return NextResponse.json(
      { error: "Fehler bei der Vorschau-Generierung. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }
}
