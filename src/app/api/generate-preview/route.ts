import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { toFile } from "openai";
import { getProductById } from "@/lib/products";
import sharp from "sharp";

export const maxDuration = 60;

function isDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === "sk-dein-key-hier" || key.trim() === "";
}

/**
 * Generate a floor mask: bottom ~45% is transparent (to be replaced),
 * top ~55% is black (to be kept). The mask uses a gradient transition
 * zone in the middle for a natural blend.
 */
async function generateFloorMask(
  width: number,
  height: number
): Promise<Buffer> {
  // Floor starts at roughly 55% from top (gradient from 45% to 55%)
  const gradientTop = Math.round(height * 0.42);
  const gradientBottom = Math.round(height * 0.55);

  // Build raw RGBA pixel buffer
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    let alpha: number;
    if (y < gradientTop) {
      // Top area: fully opaque black (keep)
      alpha = 255;
    } else if (y < gradientBottom) {
      // Gradient zone: fade from opaque to transparent
      const t = (y - gradientTop) / (gradientBottom - gradientTop);
      alpha = Math.round(255 * (1 - t));
    } else {
      // Floor area: fully transparent (replace)
      alpha = 0;
    }

    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      pixels[offset] = 0;     // R
      pixels[offset + 1] = 0; // G
      pixels[offset + 2] = 0; // B
      pixels[offset + 3] = alpha;
    }
  }

  return sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export async function POST(request: NextRequest) {
  let body: { roomImage?: string; floorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const { roomImage, floorId } = body;

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

  // Resize to 1024x1024 PNG for the API
  const resizedPng = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: "cover" })
    .png()
    .toBuffer();

  // Generate floor mask (transparent = area to replace)
  const maskPng = await generateFloorMask(1024, 1024);

  const editPrompt =
    `Photorealistic ${product.name} floor (${product.detail}). ` +
    `Natural ${product.category} flooring with correct perspective and lighting matching the room. ` +
    `The floor planks/tiles should follow the room's perspective lines naturally.`;

  // ── Try Edit API with mask (inpainting) ──
  try {
    const imageFile = await toFile(resizedPng, "room.png", {
      type: "image/png",
    });
    const maskFile = await toFile(maskPng, "mask.png", {
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

    return NextResponse.json({
      resultImage: `data:image/png;base64,${imageData.b64_json}`,
    });
  } catch (editErr: any) {
    console.error("OpenAI Edit API Error:", editErr);

    // ── Fallback: Generate API without mask ──
    try {
      const fallbackPrompt =
        `This is a photo of a room. Replace ONLY the floor/ground surface with ${product.name} (${product.detail}). ` +
        `Do NOT change any furniture, walls, doors, windows, or decorations. ` +
        `ONLY the floor surface material should change. ` +
        `The new floor should be: ${product.detail}`;

      const imageFile = await toFile(resizedPng, "room.png", {
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
        warning: "Beta-Qualität: Maske konnte nicht angewendet werden",
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
