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

    let prompt: string;
    if (textureImage) {
      prompt = "Lege in diesen Raum diesen Boden. Verändere NUR den Boden, alles andere muss exakt gleich bleiben.";
    } else {
      prompt = "Ersetze nur den Boden in diesem Raum mit neuem Bodenbelag. Alles andere bleibt gleich.";
    }

    console.log("[generate-preview] Size:", size, "Room dimensions:", roomImage.substring(0, 30));

    const content: any[] = [
      { type: "input_image", image_url: roomImage },
      ...(textureImage ? [{ type: "input_image", image_url: textureImage }] : []),
      { type: "input_text", text: prompt },
    ];

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content }],
      tools: [{ type: "image_generation", size, quality: "low", input_fidelity: "high" } as any],
    });

    const imageOutput = response.output.find((item: any) => item.type === "image_generation_call");
    if (!imageOutput || !("result" in imageOutput)) {
      return NextResponse.json({ error: "Kein Bild generiert." }, { status: 500 });
    }

    console.log("[generate-preview] Success, requested size:", size);

    return NextResponse.json({ resultImage: "data:image/png;base64," + (imageOutput as any).result });
  } catch (err: any) {
    console.error("[generate-preview]", err?.message);
    const msg =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      "Fehler bei der Generierung. Bitte erneut versuchen.";
    return NextResponse.json({ error: msg }, { status: err?.status || 500 });
  }
}
