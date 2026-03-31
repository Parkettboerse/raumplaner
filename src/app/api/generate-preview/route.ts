import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { toFile } from "openai";
import { getProductById } from "@/lib/products";

export const maxDuration = 60;

function isDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === "sk-dein-key-hier" || key.trim() === "";
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

  // ── Build prompt ──
  let prompt =
    `This is a photo of a room. Replace ONLY the floor/ground surface with ${product.name} (${product.detail}). ` +
    `\n\nCRITICAL RULES:\n` +
    `- Do NOT change, move, remove, or alter ANY objects, furniture, walls, doors, windows, or decorations\n` +
    `- Do NOT change the lighting, shadows on walls, or room geometry\n` +
    `- Do NOT change the camera angle or perspective\n` +
    `- ONLY the floor surface material should change\n` +
    `- The new floor must have correct perspective matching the original photo\n` +
    `- Keep every single detail of the room exactly the same except the floor\n` +
    `- The new floor should be: ${product.detail}`;

  if (product.texture_url) {
    prompt += `\n- The floor texture/pattern should match this reference material: ${product.name}`;
  }

  // ── Strip Base64 prefix if present ──
  const base64Data = roomImage.includes(",")
    ? roomImage.split(",")[1]
    : roomImage;

  try {
    const imageBuffer = Buffer.from(base64Data, "base64");
    const imageFile = await toFile(imageBuffer, "room.png", {
      type: "image/png",
    });

    const openai = getOpenAIClient();
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
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

    const resultImage = `data:image/png;base64,${imageData.b64_json}`;

    return NextResponse.json({ resultImage });
  } catch (err: any) {
    console.error("OpenAI API Error:", err);

    const message =
      err?.status === 429
        ? "Zu viele Anfragen. Bitte versuchen Sie es in einigen Sekunden erneut."
        : err?.status === 401
          ? "Ungültiger API-Key. Bitte prüfen Sie Ihre Konfiguration."
          : err?.message?.includes("timeout")
            ? "Die Bildgenerierung hat zu lange gedauert. Bitte versuchen Sie es erneut."
            : "Fehler bei der Bildgenerierung. Bitte versuchen Sie es erneut.";

    return NextResponse.json(
      { error: message },
      { status: err?.status || 500 }
    );
  }
}
