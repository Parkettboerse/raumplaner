import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai";
import sharp from "sharp";

export const maxDuration = 120;

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

function b64ToBuffer(dataUrl: string): Buffer {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(b64, "base64");
}

async function detectSize(dataUrl: string): Promise<"1024x1024" | "1536x1024" | "1024x1536"> {
  try {
    const buffer = b64ToBuffer(dataUrl);
    const { width: w, height: h } = await sharp(buffer).rotate().toBuffer().then(
      (rotated) => sharp(rotated).metadata()
    );
    console.log("[detect-size] rotated width:", w, "height:", h);
    if (w && h) {
      const ratio = w / h;
      if (ratio > 1.15) return "1536x1024";
      if (ratio < 0.85) return "1024x1536";
    }
  } catch (e) {
    console.error("[detect-size]", e);
  }
  return "1024x1024";
}

export async function POST(request: NextRequest) {
  let body: { roomImage?: string; floorId?: string; textureImage?: string; direction?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Ungültiger Request" }, { status: 400 });
  }

  const { roomImage, floorId, textureImage, direction } = body;
  if (!roomImage || !floorId) {
    return NextResponse.json({ error: "roomImage und floorId erforderlich" }, { status: 400 });
  }

  const { getProducts } = await import("@/lib/blob-products");
  const products = await getProducts();
  const product = products.find((p: any) => p.id === floorId) || { name: floorId, format: "", dimensions: "", verlegemuster: "", oberflaeche: "" };

  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "sk-dein-key-hier" || key.trim() === "") {
    return NextResponse.json({ resultImage: roomImage, demo: true });
  }

  try {
    const openai = getClient();
    const size = await detectSize(roomImage);

    const roomBuffer = b64ToBuffer(roomImage);
    const roomFile = await toFile(roomBuffer, "room.png", { type: "image/png" });

    const images: any[] = [roomFile];

    const parts = [
      product.name,
      product.format,
      product.dimensions,
      product.verlegemuster ? `Verlegemuster: ${product.verlegemuster}` : null,
      product.oberflaeche ? `Oberfläche: ${product.oberflaeche}` : null,
      product.category?.toLowerCase() === "vinyl" || product.category?.toLowerCase() === "laminat" || product.category?.toLowerCase() === "kork"
        ? "fugenloses Design, KEINE sichtbaren Fugen oder Fliesenkanten"
        : null,
    ].filter(Boolean).join(", ");

    const directionText = direction === "quer"
      ? " WICHTIG: Die Dielen/Planken müssen QUER zur Längsrichtung des Raumes verlegt werden, also von links nach rechts."
      : direction === "diagonal"
      ? " WICHTIG: Die Dielen/Planken müssen DIAGONAL im 45-Grad-Winkel verlegt werden."
      : "";

    let prompt: string;

    if (textureImage) {
      const texBuffer = b64ToBuffer(textureImage);
      const texFile = await toFile(texBuffer, "texture.png", { type: "image/png" });
      images.push(texFile);
      prompt = `Lege in diesen Raum diesen Boden (${parts}). Verwende EXAKT die Textur, Farbe und Maserung aus dem zweiten Bild.${directionText} Verändere NUR den Boden, alles andere muss exakt gleich bleiben.`;
    } else {
      prompt = `Lege in diesen Raum einen ${parts} Boden.${directionText} Verändere NUR den Boden, alles andere muss exakt gleich bleiben.`;
    }

    const result = await (openai.images.edit as any)({
      model: "gpt-image-1.5",
      image: images,
      prompt,
      size,
      quality: "medium",
      input_fidelity: "high",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "Kein Bild generiert." }, { status: 500 });
    }

    // Match output to original aspect ratio
    const originalBuffer = b64ToBuffer(roomImage);
    const originalMeta = await sharp(originalBuffer).metadata();
    const ow = originalMeta.width || 1024;
    const oh = originalMeta.height || 1024;

    const generatedBuffer = Buffer.from(b64, "base64");
    const genMeta = await sharp(generatedBuffer).metadata();
    const gw = genMeta.width || 1024;
    const gh = genMeta.height || 1024;

    console.log("[generate-preview] Original:", ow, "x", oh, "Generated:", gw, "x", gh);

    // Only resize if aspect ratios differ significantly
    const origRatio = ow / oh;
    const genRatio = gw / gh;

    let finalB64 = b64;
    if (Math.abs(origRatio - genRatio) > 0.1) {
      const resizedBuffer = await sharp(generatedBuffer)
        .resize(ow, oh, { fit: "fill" })
        .jpeg({ quality: 90 })
        .toBuffer();
      finalB64 = resizedBuffer.toString("base64");
      console.log("[generate-preview] Resized to match original:", ow, "x", oh);
    }

    return NextResponse.json({ resultImage: `data:image/jpeg;base64,${finalB64}` });
  } catch (err: any) {
    console.error("[generate-preview]", err?.message);
    const msg =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      "Fehler bei der Generierung. Bitte erneut versuchen.";
    return NextResponse.json({ error: msg }, { status: err?.status || 500 });
  }
}
