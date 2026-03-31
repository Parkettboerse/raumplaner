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
    const metadata = await sharp(buffer).metadata();
    const w = metadata.width || 0;
    const h = metadata.height || 0;
    console.log("[detect-size] width:", w, "height:", h);
    if (w > 0 && h > 0) {
      const ratio = w / h;
      if (ratio > 1.15) return "1536x1024";
      if (ratio < 0.85) return "1024x1536";
      return "1024x1024";
    }
  } catch (e) {
    console.error("[detect-size] Error:", e);
  }
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
    const size = await detectSize(roomImage);

    const roomBuffer = b64ToBuffer(roomImage);
    const roomFile = await toFile(roomBuffer, "room.png", { type: "image/png" });

    const images: any[] = [roomFile];
    let prompt: string;

    if (textureImage) {
      const texBuffer = b64ToBuffer(textureImage);
      const texFile = await toFile(texBuffer, "texture.png", { type: "image/png" });
      images.push(texFile);
      prompt = "Lege in diesen Raum diesen Boden. Verändere NUR den Boden, alles andere muss exakt gleich bleiben.";
    } else {
      prompt = "Ersetze nur den Boden in diesem Raum mit neuem Bodenbelag. Alles andere bleibt gleich.";
    }

    const result = await (openai.images.edit as any)({
      model: "gpt-image-1.5",
      image: images,
      prompt,
      size,
      quality: "low",
      input_fidelity: "high",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "Kein Bild generiert." }, { status: 500 });
    }

    return NextResponse.json({ resultImage: `data:image/png;base64,${b64}` });
  } catch (err: any) {
    console.error("[generate-preview]", err?.message);
    const msg =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      "Fehler bei der Generierung. Bitte erneut versuchen.";
    return NextResponse.json({ error: msg }, { status: err?.status || 500 });
  }
}
