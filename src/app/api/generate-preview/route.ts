import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { toFile } from "openai";
import { getProductById } from "@/lib/products";
import { createFloorMask, createCompositeMask } from "@/lib/createMask";
import sharp from "sharp";

export const maxDuration = 60;

const SIZE = 1024;

interface FloorPoint {
  x: number;
  y: number;
}

function isDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === "sk-dein-key-hier" || key.trim() === "";
}

const FALLBACK_POLYGON: FloorPoint[] = [
  { x: 0, y: 50 },
  { x: 100, y: 45 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

/**
 * Composite: take floor area from generated image and place it
 * onto the original image. Everything outside the floor polygon
 * stays pixel-perfect from the original.
 */
async function compositeFloor(
  originalPng: Buffer,
  generatedPng: Buffer,
  compositeMask: Buffer
): Promise<Buffer> {
  // Use the mask as alpha channel on the generated image:
  // where mask is white (floor) → show generated pixels
  // where mask is black (non-floor) → transparent
  const maskedFloor = await sharp(generatedPng)
    .ensureAlpha()
    .joinChannel(compositeMask)
    .png()
    .toBuffer();

  // Composite the masked floor onto the original
  return sharp(originalPng)
    .composite([{ input: maskedFloor, blend: "over" }])
    .png()
    .toBuffer();
}

export async function POST(request: NextRequest) {
  let body: {
    roomImage?: string;
    floorId?: string;
    floorRegion?: FloorPoint[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const { roomImage, floorId, floorRegion } = body;

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

  // ── Demo mode ──
  if (isDemoMode()) {
    return NextResponse.json({
      resultImage: roomImage,
      demo: true,
      warning: "Demo-Modus: Kein OpenAI API Key konfiguriert",
    });
  }

  const base64Data = roomImage.includes(",")
    ? roomImage.split(",")[1]
    : roomImage;

  const imageBuffer = Buffer.from(base64Data, "base64");

  // Resize original to 1024x1024 PNG
  const originalPng = await sharp(imageBuffer)
    .resize(SIZE, SIZE, { fit: "cover" })
    .png()
    .toBuffer();

  const polygon =
    floorRegion && floorRegion.length >= 3 ? floorRegion : FALLBACK_POLYGON;

  // Create both masks
  const [editMask, compositeMask] = await Promise.all([
    createFloorMask(polygon, SIZE, SIZE),
    createCompositeMask(polygon, SIZE, SIZE),
  ]);

  const editPrompt =
    `Replace the floor area with photorealistic ${product.name} (${product.detail}) flooring. ` +
    `Match the perspective and lighting of the original room photo. ` +
    `Natural ${product.category} flooring with correct perspective lines.`;

  try {
    const imageFile = await toFile(originalPng, "room.png", {
      type: "image/png",
    });
    const maskFile = await toFile(editMask, "mask.png", {
      type: "image/png",
    });

    const openai = getOpenAIClient();
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      mask: maskFile,
      prompt: editPrompt,
      n: 1,
      size: "1024x1024",
    });

    const imageData = response.data?.[0];

    if (!imageData?.b64_json) {
      return NextResponse.json(
        { error: "Keine Bilddaten in der API-Antwort erhalten" },
        { status: 500 }
      );
    }

    // ── Composite: take ONLY the floor from AI output, keep original everywhere else ──
    const generatedPng = Buffer.from(imageData.b64_json, "base64");

    const finalImage = await compositeFloor(
      originalPng,
      generatedPng,
      compositeMask
    );

    const resultBase64 = `data:image/png;base64,${finalImage.toString("base64")}`;

    return NextResponse.json({ resultImage: resultBase64 });
  } catch (editErr: any) {
    console.error("OpenAI Edit API Error:", editErr);

    // ── Fallback: Edit without mask, no compositing ──
    try {
      const fallbackPrompt =
        `This is a photo of a room. Replace ONLY the floor/ground surface with ${product.name} (${product.detail}). ` +
        `Do NOT change any furniture, walls, doors, windows, or decorations. ` +
        `ONLY the floor surface material should change.`;

      const imageFile = await toFile(originalPng, "room.png", {
        type: "image/png",
      });

      const openai = getOpenAIClient();
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: fallbackPrompt,
        n: 1,
        size: "1024x1024",
      });

      const imageData = response.data?.[0];

      if (!imageData?.b64_json) {
        return NextResponse.json(
          { error: "Keine Bilddaten in der API-Antwort erhalten" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        resultImage: `data:image/png;base64,${imageData.b64_json}`,
        beta: true,
        warning: "Beta-Qualität: Compositing konnte nicht angewendet werden",
      });
    } catch (fallbackErr: any) {
      console.error("OpenAI Fallback Error:", fallbackErr);

      const message =
        fallbackErr?.status === 429
          ? "Zu viele Anfragen. Bitte versuchen Sie es in einigen Sekunden erneut."
          : fallbackErr?.status === 401
            ? "Ungültiger API-Key. Bitte prüfen Sie Ihre Konfiguration."
            : "Fehler bei der Bildgenerierung. Bitte versuchen Sie es erneut.";

      return NextResponse.json(
        { error: message },
        { status: fallbackErr?.status || 500 }
      );
    }
  }
}
