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
 * Build the strict German prompt that tells the model to ONLY replace the floor.
 */
function buildPrompt(productName: string, productCategory: string, productDetail: string, hasTexture: boolean): string {
  if (hasTexture) {
    return `Du siehst zwei Bilder:
Bild 1: Ein Foto eines Raumes.
Bild 2: Eine Textur/Muster eines Bodenbelags (Produktname: ${productName}, Typ: ${productCategory}, Details: ${productDetail}).

AUFGABE: Erstelle eine fotorealistische Version von Bild 1, bei der AUSSCHLIESSLICH der Bodenbelag durch den Boden aus Bild 2 ersetzt wird.

STRIKTE REGELN:
- Der Boden muss die EXAKTE Textur, Farbe und Maserung aus Bild 2 haben
- Der Boden muss perspektivisch korrekt verlegt sein (Fluchtpunkte beachten)
- ALLE Möbel, Wände, Decken, Fenster, Türen, Deko, Pflanzen, Teppiche und sonstige Einrichtungsgegenstände müssen PIXEL FÜR PIXEL identisch zu Bild 1 bleiben
- Beleuchtung, Schatten und Reflexionen auf dem neuen Boden müssen zur Raumbeleuchtung aus Bild 1 passen
- Das Ergebnis muss aussehen wie ein echtes Foto — KEINE künstlichen Artefakte
- Verändere NICHTS außer dem Boden. Wenn du unsicher bist ob etwas zum Boden gehört, lass es unverändert.`;
  }

  return `Du siehst ein Foto eines Raumes.

AUFGABE: Erstelle eine fotorealistische Version dieses Fotos, bei der AUSSCHLIESSLICH der Bodenbelag durch ${productName} (${productDetail}) ersetzt wird.

STRIKTE REGELN:
- ALLE Möbel, Wände, Decken, Fenster, Türen, Deko, Pflanzen und sonstige Einrichtungsgegenstände müssen PIXEL FÜR PIXEL identisch bleiben
- Der neue Boden muss perspektivisch korrekt verlegt sein
- Beleuchtung, Schatten und Reflexionen müssen zur Raumbeleuchtung passen
- Das Ergebnis muss aussehen wie ein echtes Foto
- Verändere NICHTS außer dem Boden.`;
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

  // Ensure images are data URLs
  const roomDataUrl = roomImage.startsWith("data:") ? roomImage : `data:image/jpeg;base64,${roomImage}`;
  const textureDataUrl = textureImage
    ? (textureImage.startsWith("data:") ? textureImage : `data:image/jpeg;base64,${textureImage}`)
    : null;

  const prompt = buildPrompt(product.name, product.category, product.detail, !!textureDataUrl);

  // Build input content array
  const content: any[] = [
    { type: "input_image", image_url: roomDataUrl },
  ];
  if (textureDataUrl) {
    content.push({ type: "input_image", image_url: textureDataUrl });
  }
  content.push({ type: "input_text", text: prompt });

  console.log("[generate-preview] Product:", product.name, "| Has texture:", !!textureDataUrl);

  // Retry logic: up to 2 attempts
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const openai = getClient();

      const response = await openai.responses.create({
        model: "gpt-4o",
        input: [{ role: "user", content }],
        tools: [{
          type: "image_generation",
          // TODO: Test gpt-image-1-mini with quality "medium" (~$0.02/image vs $0.08)
          // TODO: Implement caching for same room+floor combos
        }],
      });

      // Extract generated image
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

      // Check if there's a text response explaining why no image was generated
      const textOutput = response.output.find((item: any) => item.type === "message");
      if (textOutput && "content" in textOutput) {
        console.error("[generate-preview] Text response instead of image:", JSON.stringify(textOutput).slice(0, 300));
      } else {
        console.error("[generate-preview] No image in output:", JSON.stringify(response.output).slice(0, 300));
      }

      // Only retry if this was the first attempt
      if (attempt < 2) {
        console.log("[generate-preview] Retrying...");
        continue;
      }

      return NextResponse.json({ error: "Bildgenerierung fehlgeschlagen. Bitte versuchen Sie es erneut." }, { status: 500 });
    } catch (err: any) {
      console.error(`[generate-preview] Attempt ${attempt} error:`, err?.message, err?.status);

      if (attempt < 2 && err?.status !== 401 && err?.status !== 429) {
        console.log("[generate-preview] Retrying after error...");
        continue;
      }

      const msg =
        err?.status === 429 ? "Zu viele Anfragen. Bitte warten Sie einen Moment." :
        err?.status === 401 ? "Ungültiger API-Key. Bitte prüfen Sie die Konfiguration." :
        err?.status === 400 ? "Anfrage wurde abgelehnt. Bitte versuchen Sie ein anderes Foto." :
        `Fehler bei der Generierung. Bitte erneut versuchen.`;

      return NextResponse.json({ error: msg }, { status: err?.status || 500 });
    }
  }

  return NextResponse.json({ error: "Generierung fehlgeschlagen." }, { status: 500 });
}
