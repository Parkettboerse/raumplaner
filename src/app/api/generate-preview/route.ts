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

/**
 * Detect aspect ratio from a base64 data URL by reading the image header.
 * Returns the best matching OpenAI size parameter.
 */
function detectSize(dataUrl: string): "1536x1024" | "1024x1536" | "1024x1024" {
  // Extract base64 data
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const buf = Buffer.from(b64, "base64");

  let width = 0;
  let height = 0;

  // JPEG: find SOF0 marker (FF C0) which contains dimensions
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length - 8; i++) {
      if (buf[i] === 0xff && (buf[i + 1] === 0xc0 || buf[i + 1] === 0xc2)) {
        height = buf.readUInt16BE(i + 5);
        width = buf.readUInt16BE(i + 7);
        break;
      }
    }
  }
  // PNG: dimensions at fixed offset
  else if (buf[0] === 0x89 && buf[1] === 0x50) {
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  }

  console.log("[generate-preview] Detected dimensions:", width, "x", height);

  if (width === 0 || height === 0) return "1024x1024";

  const ratio = width / height;
  if (ratio > 1.2) return "1536x1024";      // landscape
  if (ratio < 0.83) return "1024x1536";      // portrait
  return "1024x1024";                         // square-ish
}

function buildPrompt(productName: string, productCategory: string, productDetail: string, hasTexture: boolean): string {
  if (hasTexture) {
    return `Du siehst zwei Bilder:
Bild 1: Ein Foto eines Raumes. Dies ist das REFERENZBILD — alles in diesem Bild ausser dem Boden muss EXAKT so bleiben wie es ist.
Bild 2: Eine Textur/Muster eines Bodenbelags (${productName}, ${productCategory}).

AUFGABE: Erstelle eine fotorealistische Version von Bild 1, bei der AUSSCHLIESSLICH der Bodenbelag durch den Boden aus Bild 2 ersetzt wird.

STRIKTE REGELN — KEINE AUSNAHMEN:
- Der Boden muss die EXAKTE Textur, Farbe und Maserung aus Bild 2 haben
- Der Boden muss perspektivisch korrekt verlegt sein (Fluchtpunkte des Originalfotos beachten)
- ALLE Möbel, Wände, Decken, Fenster, Türen, Deko, Pflanzen, Teppiche, Regale und sonstige Einrichtungsgegenstände müssen IDENTISCH zu Bild 1 bleiben — gleiche Position, gleiche Farbe, gleiche Form
- Die Raumgeometrie, der Blickwinkel und die Perspektive müssen EXAKT dem Original entsprechen
- Beleuchtung, Schatten und Reflexionen auf dem neuen Boden müssen zur Raumbeleuchtung aus Bild 1 passen
- Das Ergebnis muss aussehen wie ein echtes Foto — KEINE künstlichen Artefakte, KEINE Verzerrungen
- Verändere NICHTS ausser dem Boden. Absolut nichts. Wenn du unsicher bist ob etwas zum Boden gehört, lass es unverändert.
- Das Bild muss die GLEICHE Komposition und den GLEICHEN Bildausschnitt wie Bild 1 haben`;
  }

  return `Du siehst ein Foto eines Raumes. Dies ist das REFERENZBILD.

AUFGABE: Erstelle eine fotorealistische Version dieses Fotos, bei der AUSSCHLIESSLICH der Bodenbelag durch ${productName} (${productDetail}) ersetzt wird.

STRIKTE REGELN — KEINE AUSNAHMEN:
- ALLE Möbel, Wände, Decken, Fenster, Türen, Deko, Pflanzen und sonstige Einrichtungsgegenstände müssen IDENTISCH bleiben
- Die Raumgeometrie, der Blickwinkel und die Perspektive müssen EXAKT dem Original entsprechen
- Beleuchtung und Schatten müssen zur Raumbeleuchtung passen
- Verändere NICHTS ausser dem Boden
- Das Bild muss die GLEICHE Komposition wie das Original haben`;
}

export async function POST(request: NextRequest) {
  let body: { roomImage?: string; floorId?: string; textureImage?: string };
  try {
    body = await request.json();
  } catch {
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
    return NextResponse.json({ resultImage: roomImage, demo: true, warning: "Demo-Modus: Kein API Key" });
  }

  const roomDataUrl = roomImage.startsWith("data:") ? roomImage : `data:image/jpeg;base64,${roomImage}`;
  const textureDataUrl = textureImage
    ? (textureImage.startsWith("data:") ? textureImage : `data:image/jpeg;base64,${textureImage}`)
    : null;

  // Detect aspect ratio from the uploaded room image
  const outputSize = detectSize(roomDataUrl);

  const prompt = buildPrompt(product.name, product.category, product.detail, !!textureDataUrl);

  const content: any[] = [
    { type: "input_image", image_url: roomDataUrl },
  ];
  if (textureDataUrl) {
    content.push({ type: "input_image", image_url: textureDataUrl });
  }
  content.push({ type: "input_text", text: prompt });

  console.log("[generate-preview] Product:", product.name, "| Texture:", !!textureDataUrl, "| Size:", outputSize);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const openai = getClient();

      const response = await openai.responses.create({
        model: "gpt-4o",
        input: [{ role: "user", content }],
        tools: [{
          type: "image_generation",
          quality: "low",
          size: outputSize,
        }],
      });

      const imageOutput = response.output.find(
        (item: any) => item.type === "image_generation_call"
      );

      if (imageOutput && "result" in imageOutput) {
        const b64 = (imageOutput as any).result;
        console.log("[generate-preview] Success on attempt", attempt);
        return NextResponse.json({
          resultImage: `data:image/png;base64,${b64}`,
        });
      }

      const textOutput = response.output.find((item: any) => item.type === "message");
      console.error("[generate-preview] No image:", JSON.stringify(textOutput || response.output).slice(0, 300));

      if (attempt < 2) continue;
      return NextResponse.json({ error: "Bildgenerierung fehlgeschlagen. Bitte erneut versuchen." }, { status: 500 });
    } catch (err: any) {
      console.error(`[generate-preview] Attempt ${attempt}:`, err?.message, err?.status);

      if (attempt < 2 && err?.status !== 401 && err?.status !== 429) continue;

      const msg =
        err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
        err?.status === 401 ? "Ungültiger API-Key." :
        err?.status === 400 ? "Anfrage abgelehnt. Bitte anderes Foto versuchen." :
        "Fehler bei der Generierung. Bitte erneut versuchen.";

      return NextResponse.json({ error: msg }, { status: err?.status || 500 });
    }
  }

  return NextResponse.json({ error: "Generierung fehlgeschlagen." }, { status: 500 });
}
