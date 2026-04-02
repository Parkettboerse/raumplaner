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
    const compressedRoom = await sharp(roomBuffer)
      .resize(768, 768, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    const roomFile = await toFile(compressedRoom, "room.jpg", { type: "image/jpeg" });

    const images: any[] = [roomFile];

    // Build smart description based on product properties
    const dims = product.dimensions || "";
    const format = product.format || "";
    const category = (product.category || "").toLowerCase();
    const oberflaeche = product.oberflaeche || "";
    const verlegemuster = product.verlegemuster || "";

    let floorDescription = product.name;

    if (dims) {
      const match = dims.match(/(\d+)\s*[x×]\s*(\d+)/i);
      if (match) {
        const w = parseInt(match[1]);
        const h = parseInt(match[2]);
        const longer = Math.max(w, h);
        const shorter = Math.min(w, h);

        if (longer > 1000) {
          floorDescription += `, lange Dielen/Planken (${dims})`;
        } else if (longer > 500) {
          floorDescription += `, mittelgroße rechteckige Platten (${dims})`;
        } else {
          floorDescription += `, Format ${dims}`;
        }

        if (longer / shorter > 3) {
          floorDescription += ", deutlich längliches Format";
        } else if (longer / shorter > 1.5) {
          floorDescription += ", rechteckiges Format";
        } else {
          floorDescription += ", annähernd quadratisches Format";
        }
      } else {
        floorDescription += `, Maße: ${dims}`;
      }
    }

    if (format) floorDescription += `, ${format}`;
    if (oberflaeche) floorDescription += `, Oberfläche: ${oberflaeche}`;
    if (verlegemuster) floorDescription += `, Verlegemuster: ${verlegemuster}`;

    let jointHint = "";
    if (category === "vinyl" || category === "laminat" || category === "kork") {
      jointHint = " STRENG VERBOTEN: KEINE Fugen, KEINE Fliesenkanten, KEINE Zementlinien. Dies ist KEIN Fliesenboden. Es ist ein durchgängiger Vinyl-/Laminatboden aus Planken die fugenlos aneinander liegen. Der Boden muss wie eine durchgehende Fläche aussehen.";
    } else if (category === "parkett") {
      jointHint = " Die Dielen liegen eng aneinander ohne breite Fugen.";
    } else if (category === "fliese") {
      jointHint = " Zwischen den Fliesen sind schmale Fugen sichtbar.";
    }

    let prompt: string;

    if (textureImage) {
      const texBuffer = b64ToBuffer(textureImage);
      const compressedTex = await sharp(texBuffer)
        .resize(512, 512, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .toBuffer();
      const texFile = await toFile(compressedTex, "texture.jpg", { type: "image/jpeg" });
      images.push(texFile);
      prompt = `Lege in diesen Raum diesen Boden (${floorDescription}).${jointHint} Verwende EXAKT die Textur, Farbe und Maserung aus dem zweiten Bild. Verändere NUR den Boden, alles andere muss exakt gleich bleiben.`;
    } else {
      prompt = `Lege in diesen Raum einen ${floorDescription} Boden.${jointHint} Verändere NUR den Boden, alles andere muss exakt gleich bleiben.`;
    }

    console.log("[generate-preview] Prompt:", prompt);

    const result = await (openai.images.edit as any)({
      model: "gpt-image-1.5",
      image: images,
      prompt,
      size,
      quality: "medium",
      input_fidelity: "low",
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
    if (true) {
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
