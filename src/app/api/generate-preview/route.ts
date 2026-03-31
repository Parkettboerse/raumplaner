import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai";
import { getProducts } from "@/lib/blob-products";

export const maxDuration = 120;

function isDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === "sk-dein-key-hier" || key.trim() === "";
}

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

function b64ToBuffer(dataUrl: string): Buffer {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(b64, "base64");
}

export async function POST(request: NextRequest) {
  let body: { roomImage?: string; floorId?: string; textureImage?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Ungültiger Request" }, { status: 400 });
  }

  const { roomImage, floorId, textureImage } = body;
  if (!roomImage || !floorId) {
    return NextResponse.json({ error: "roomImage und floorId erforderlich" }, { status: 400 });
  }

  const products = await getProducts();
  const product = products.find((p: any) => p.id === floorId);
  if (!product) {
    return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ resultImage: roomImage, demo: true, warning: "Demo-Modus" });
  }

  try {
    const openai = getClient();

    // Convert base64 images to File objects for the Edit API
    const roomBuffer = b64ToBuffer(roomImage);
    const roomFile = await toFile(roomBuffer, "room.png", { type: "image/png" });

    const images: any[] = [roomFile];
    let prompt: string;

    if (textureImage) {
      const texBuffer = b64ToBuffer(textureImage);
      const texFile = await toFile(texBuffer, "texture.png", { type: "image/png" });
      images.push(texFile);
      prompt = `Edit the first image: replace ONLY the floor with the flooring texture shown in the second image (${product.name}). Keep everything else exactly the same - all furniture, walls, windows, doors, decoration, plants must remain identical. The new floor must match the perspective and lighting of the room.`;
    } else {
      prompt = `Edit this image: replace ONLY the floor with photorealistic ${product.name} flooring (${product.detail}). Keep everything else exactly the same - all furniture, walls, decoration must remain identical.`;
    }

    console.log("[generate-preview] Calling images.edit, product:", product.name, "images:", images.length);

    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: images,
      prompt,
      size: "1024x1024",
      quality: "low",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[generate-preview] No b64_json in response");
      return NextResponse.json({ error: "Kein Bild generiert." }, { status: 500 });
    }

    console.log("[generate-preview] Success");
    return NextResponse.json({ resultImage: `data:image/png;base64,${b64}` });
  } catch (err: any) {
    console.error("[generate-preview] Error:", err?.message, err?.status);
    const msg =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      err?.status === 400 ? "Anfrage abgelehnt. Bitte anderes Foto versuchen." :
      "Fehler bei der Generierung. Bitte erneut versuchen.";
    return NextResponse.json({ error: msg }, { status: err?.status || 500 });
  }
}
