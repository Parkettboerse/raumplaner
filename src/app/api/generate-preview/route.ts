import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getProducts } from "@/lib/blob-products";

export const maxDuration = 60;

function isDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === "sk-dein-key-hier" || key.trim() === "";
}

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
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

  try {
    const openai = getClient();

    // Build input content: room image + optional texture image + prompt
    const content: any[] = [
      {
        type: "input_image",
        image_url: roomImage.startsWith("data:") ? roomImage : `data:image/jpeg;base64,${roomImage}`,
      },
    ];

    if (textureImage) {
      content.push({
        type: "input_image",
        image_url: textureImage.startsWith("data:") ? textureImage : `data:image/jpeg;base64,${textureImage}`,
      });
    }

    content.push({
      type: "input_text",
      text: textureImage
        ? `I'm sending you two images. Image 1 is a photo of a room. Image 2 is a floor texture (${product.name} - ${product.detail}).

Replace ONLY the floor in the room photo with exactly this floor texture.
- Keep ALL furniture, walls, windows, objects, lighting and room geometry EXACTLY the same
- The new floor must have correct perspective matching the room
- Natural shadows and light reflections on the new floor
- Photorealistic result
- ONLY the floor surface changes, NOTHING else`
        : `This is a photo of a room. Replace ONLY the floor with photorealistic ${product.name} flooring (${product.detail}).
- Keep ALL furniture, walls, windows, objects, lighting and room geometry EXACTLY the same
- The new floor must have correct perspective
- Natural shadows and light reflections
- ONLY the floor surface changes, NOTHING else`,
    });

    console.log("[generate-preview] Calling OpenAI Responses API, product:", product.name);

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content,
        },
      ],
      tools: [
        {
          type: "image_generation",
          quality: "low",
          size: "1024x1024",
        },
      ],
    });

    // Find the generated image in the output
    const imageOutput = response.output.find(
      (o: any) => o.type === "image_generation_call"
    );

    if (imageOutput && "result" in imageOutput) {
      console.log("[generate-preview] Image generated successfully");
      const b64 = (imageOutput as any).result;
      return NextResponse.json({
        resultImage: `data:image/png;base64,${b64}`,
      });
    }

    console.error("[generate-preview] No image in output:", JSON.stringify(response.output).slice(0, 200));
    return NextResponse.json({ error: "Keine Bildgenerierung erhalten" }, { status: 500 });
  } catch (err: any) {
    console.error("[generate-preview] Error:", err?.message, err?.status);
    const msg =
      err?.status === 429 ? "Zu viele Anfragen. Bitte warten." :
      err?.status === 401 ? "Ungültiger API-Key." :
      `Fehler: ${err?.message || "Unbekannt"}`;
    return NextResponse.json({ error: msg }, { status: err?.status || 500 });
  }
}
