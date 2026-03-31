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

const CATEGORY_COLORS: Record<string, { r: number; g: number; b: number }> = {
  parkett: { r: 180, g: 140, b: 90 },
  vinyl: { r: 160, g: 155, b: 145 },
  laminat: { r: 190, g: 165, b: 120 },
  kork: { r: 195, g: 165, b: 110 },
};

/**
 * Tile a texture image to fill width x height.
 */
async function tileTexture(
  textureBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  const meta = await sharp(textureBuffer).metadata();
  const tw = meta.width || 256;
  const th = meta.height || 256;

  // Scale tile to ~256px wide, keep aspect ratio
  const tileW = 256;
  const tileH = Math.round((th / tw) * tileW);
  const tile = await sharp(textureBuffer)
    .resize(tileW, tileH)
    .png()
    .toBuffer();

  const cols = Math.ceil(width / tileW);
  const rows = Math.ceil(height / tileH);

  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      composites.push({ input: tile, left: col * tileW, top: row * tileH });
    }
  }

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

/**
 * Fetch texture from URL. Returns buffer or null on failure.
 */
async function fetchTexture(url: string): Promise<Buffer | null> {
  try {
    console.log("[generate-preview] Fetching texture:", url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[generate-preview] Texture fetch failed:", res.status);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("[generate-preview] Texture fetch error:", err);
    return null;
  }
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
    const originalMeta = await sharp(imageBuffer).metadata();
    const width = originalMeta.width || 1024;
    const height = originalMeta.height || 1024;

    console.log("[generate-preview] Image size:", width, "x", height);

    const polygon =
      floorPoints && floorPoints.length >= 3 ? floorPoints : FALLBACK_POLYGON;
    console.log("[generate-preview] Floor polygon:", JSON.stringify(polygon));

    // 1. Create floor mask (white = floor area)
    const maskPng = await createFloorMask(polygon, width, height);

    // 2. Get texture
    let textureBuffer: Buffer | null = null;
    if (product.texture_url) {
      textureBuffer = await fetchTexture(product.texture_url);
    }

    let tiledTexture: Buffer;
    if (textureBuffer) {
      console.log("[generate-preview] Tiling real texture");
      tiledTexture = await tileTexture(textureBuffer, width, height);
    } else {
      console.log("[generate-preview] Using category color fallback");
      const color = CATEGORY_COLORS[product.category] || CATEGORY_COLORS.parkett;
      tiledTexture = await sharp({
        create: { width, height, channels: 4, background: { ...color, alpha: 1 } },
      })
        .png()
        .toBuffer();
    }

    // 3. Mask the texture: use floor mask as alpha channel
    //    White in mask (255) → show texture at 80% opacity
    //    Black in mask (0) → fully transparent
    const maskRaw = await sharp(maskPng)
      .resize(width, height, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer();

    const textureRaw = await sharp(tiledTexture)
      .resize(width, height, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer();

    const pixelCount = width * height;
    const maskedPixels = Buffer.alloc(pixelCount * 4);

    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4;
      maskedPixels[offset] = textureRaw[offset];         // R
      maskedPixels[offset + 1] = textureRaw[offset + 1]; // G
      maskedPixels[offset + 2] = textureRaw[offset + 2]; // B
      maskedPixels[offset + 3] = Math.round((maskRaw[i] / 255) * 204); // 80% of mask value (204 = 255 * 0.8)
    }

    const maskedTexturePng = await sharp(maskedPixels, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();

    // 4. Composite masked texture over original
    const originalPng = await sharp(imageBuffer).png().toBuffer();

    const result = await sharp(originalPng)
      .composite([{ input: maskedTexturePng, blend: "over" }])
      .jpeg({ quality: 85 })
      .toBuffer();

    console.log("[generate-preview] Result size:", result.length, "bytes");

    return NextResponse.json({
      resultImage: `data:image/jpeg;base64,${result.toString("base64")}`,
    });
  } catch (err) {
    console.error("[generate-preview] Error:", err);
    return NextResponse.json(
      { error: "Fehler bei der Vorschau-Generierung. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }
}
