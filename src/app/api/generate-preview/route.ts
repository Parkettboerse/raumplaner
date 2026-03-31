import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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

async function detectAspectRatio(dataUrl: string): Promise<"1536x1024" | "1024x1536" | "1024x1024"> {
  const buffer = b64ToBuffer(dataUrl);
  const metadata = await sharp(buffer).metadata();
  const w = metadata.width || 1024;
  const h = metadata.height || 1024;
  if (w > h * 1.2) return "1536x1024";
  if (h > w * 1.2) return "1024x1536";
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

  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "sk-dein-key-hier" || key.trim() === "") {
    return NextResponse.json({ resultImage: roomImage, demo: true });
  }

  try {
    const openai = getClient();
    const size = await detectAspectRatio(roomImage);

    const content: any[] = [
      { type: "input_image", image_url: roomImage },
    ];

    if (textureImage) {
      content.push({ type: "input_image", image_url: textureImage });
    }

    content.push({
      type: "input_text",
      text: "Lege in diesen Raum diesen Boden. Verändere NUR den Boden, alles andere muss exakt gleich bleiben."
    });

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [{ role: "user", content }],
      tools: [{ type: "image_generation", size, quality: "low" }],
    });

    const imageOutput = response.output.find(
      (item: any) => item.type === "image_generation_call"
    );

    if (!imageOutput || !("result" in imageOutput)) {
      return NextResponse.json({ error: "Kein Bild generiert." }, { status: 500 });
    }

    return NextResponse.json({
      resultImage: "data:image/png;base64," + (imageOutput as any).result
    });
  } catch (err: any) {
    console.error("[generate-preview]", err?.message);
    const msg =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      "Fehler bei der Generierung. Bitte erneut versuchen.";
    return NextResponse.json({ error: msg }, { status: err?.status || 500 });
  }
}
