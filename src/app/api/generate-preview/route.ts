import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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

function detectSize(dataUrl: string): "1536x1024" | "1024x1536" | "1024x1024" {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const buf = Buffer.from(b64, "base64");
  let w = 0, h = 0;

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length - 8; i++) {
      if (buf[i] === 0xff && (buf[i + 1] === 0xc0 || buf[i + 1] === 0xc2)) {
        h = buf.readUInt16BE(i + 5);
        w = buf.readUInt16BE(i + 7);
        break;
      }
    }
  }
  // PNG
  else if (buf[0] === 0x89 && buf[1] === 0x50) {
    w = buf.readUInt32BE(16);
    h = buf.readUInt32BE(20);
  }

  const ratio = w && h ? w / h : 1;
  if (ratio > 1.2) return "1536x1024";
  if (ratio < 0.83) return "1024x1536";
  return "1024x1024";
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

  const roomUrl = roomImage.startsWith("data:") ? roomImage : `data:image/jpeg;base64,${roomImage}`;
  const texUrl = textureImage
    ? (textureImage.startsWith("data:") ? textureImage : `data:image/jpeg;base64,${textureImage}`)
    : null;
  const size = detectSize(roomUrl);

  // Simple prompt — exactly like ChatGPT
  const prompt = texUrl
    ? `Lege in diesen Raum diesen Boden (${product.name}). Verändere NUR den Boden, alles andere muss exakt gleich bleiben.`
    : `Lege in diesen Raum einen ${product.name} Boden (${product.detail}). Verändere NUR den Boden, alles andere muss exakt gleich bleiben.`;

  const content: any[] = [
    { type: "input_image", image_url: roomUrl },
  ];
  if (texUrl) content.push({ type: "input_image", image_url: texUrl });
  content.push({ type: "input_text", text: prompt });

  console.log("[generate-preview]", product.name, "| texture:", !!texUrl, "| size:", size);

  try {
    const openai = getClient();
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [{ role: "user", content }],
      tools: [{ type: "image_generation", size }],
    });

    const img = response.output.find((o: any) => o.type === "image_generation_call");
    if (img && "result" in img) {
      console.log("[generate-preview] OK");
      return NextResponse.json({ resultImage: `data:image/png;base64,${(img as any).result}` });
    }

    console.error("[generate-preview] No image:", JSON.stringify(response.output).slice(0, 200));
    return NextResponse.json({ error: "Bildgenerierung fehlgeschlagen." }, { status: 500 });
  } catch (err: any) {
    console.error("[generate-preview]", err?.message, err?.status);
    const msg =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      "Fehler bei der Generierung. Bitte erneut versuchen.";
    return NextResponse.json({ error: msg }, { status: err?.status || 500 });
  }
}
