import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { toFile } from "openai";
import { getProducts } from "@/lib/blob-products";

export const maxDuration = 60;

function isDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === "sk-dein-key-hier" || key.trim() === "";
}

export async function POST(request: NextRequest) {
  let body: {
    roomImage?: string;
    mask?: string;
    floorId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request" }, { status: 400 });
  }

  const { roomImage, mask, floorId } = body;
  if (!roomImage || !mask || !floorId) {
    return NextResponse.json({ error: "roomImage, mask und floorId sind erforderlich" }, { status: 400 });
  }

  // Find product
  const products = await getProducts();
  const product = products.find((p: any) => p.id === floorId);
  if (!product) {
    return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
  }

  // Demo mode
  if (isDemoMode()) {
    return NextResponse.json({
      resultImage: roomImage,
      demo: true,
      warning: "Demo-Modus: Kein OpenAI API Key konfiguriert",
    });
  }

  // Strip base64 prefixes
  const roomB64 = roomImage.includes(",") ? roomImage.split(",")[1] : roomImage;
  const maskB64 = mask.includes(",") ? mask.split(",")[1] : mask;

  try {
    const roomBuffer = Buffer.from(roomB64, "base64");
    const maskBuffer = Buffer.from(maskB64, "base64");

    const imageFile = await toFile(roomBuffer, "room.png", { type: "image/png" });
    const maskFile = await toFile(maskBuffer, "mask.png", { type: "image/png" });

    const prompt =
      `Replace the transparent area in this room photo with photorealistic ${product.name} flooring (${product.detail}). ` +
      `Apply the texture with correct perspective matching the room geometry, natural shadows and realistic lighting. ` +
      `Make it look like a professional interior photo. The flooring type is ${product.category}.`;

    console.log("[generate-preview] Calling OpenAI, product:", product.name);

    const openai = getOpenAIClient();
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      mask: maskFile,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      return NextResponse.json({ error: "Keine Bilddaten erhalten" }, { status: 500 });
    }

    console.log("[generate-preview] Success");
    return NextResponse.json({
      resultImage: `data:image/png;base64,${imageData.b64_json}`,
    });
  } catch (err: any) {
    console.error("[generate-preview] Error:", err?.message, err?.status);
    const message =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      "Fehler bei der Bildgenerierung. Bitte erneut versuchen.";
    return NextResponse.json({ error: message }, { status: err?.status || 500 });
  }
}
