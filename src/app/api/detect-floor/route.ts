import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxDuration = 30;

// ADE20K class indices for floor-like surfaces
const FLOOR_LABELS = new Set(["floor", "flooring", "rug", "carpet", "path", "road"]);

export async function POST(request: NextRequest) {
  let body: { roomImage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });
  }

  const { roomImage } = body;
  if (!roomImage) {
    return NextResponse.json({ error: "roomImage ist erforderlich" }, { status: 400 });
  }

  try {
    // Strip data URL prefix and convert to buffer
    const base64Data = roomImage.includes(",")
      ? roomImage.split(",")[1]
      : roomImage;
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Resize to max 512px for the model (faster, less memory)
    const resized = await sharp(imageBuffer)
      .resize(512, 512, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Call Hugging Face Inference API
    console.log("[detect-floor] Calling SegFormer model...");
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/nvidia/segformer-b2-finetuned-ade-20k-512-512",
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(resized),
      }
    );

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error("[detect-floor] HF API error:", hfResponse.status, errText);

      // If model is loading, return fallback
      if (hfResponse.status === 503) {
        console.log("[detect-floor] Model loading, using fallback");
        return NextResponse.json({ mask: null, fallback: true, message: "Modell wird geladen" });
      }
      return NextResponse.json({ mask: null, fallback: true });
    }

    // The API returns an array of { label, mask, score }
    const segments: { label: string; mask: string; score: number }[] =
      await hfResponse.json();

    console.log("[detect-floor] Got", segments.length, "segments:",
      segments.map((s) => `${s.label}(${s.score.toFixed(2)})`).join(", ")
    );

    // Find floor segments
    const floorSegments = segments.filter((s) => FLOOR_LABELS.has(s.label));

    if (floorSegments.length === 0) {
      console.log("[detect-floor] No floor segments found");
      return NextResponse.json({ mask: null, fallback: true });
    }

    // Combine all floor masks into one
    // Each mask is a base64-encoded PNG where white = that class
    const originalMeta = await sharp(imageBuffer).metadata();
    const origW = originalMeta.width || 512;
    const origH = originalMeta.height || 512;

    // Combine floor masks by adding them together
    // Start with a black base
    const blackBase = await sharp({
      create: { width: origW, height: origH, channels: 3, background: { r: 0, g: 0, b: 0 } },
    }).png().toBuffer();

    const composites = [];
    for (const seg of floorSegments) {
      const maskBuf = Buffer.from(seg.mask, "base64");
      const resizedMask = await sharp(maskBuf)
        .resize(origW, origH, { fit: "fill" })
        .toBuffer();
      composites.push({ input: resizedMask, blend: "add" as const });
    }

    const combinedMask = await sharp(blackBase)
      .composite(composites)
      .png()
      .toBuffer();

    // Threshold: convert to grayscale, any pixel > 128 → white, else black
    const rawMask = await sharp(combinedMask).greyscale().raw().toBuffer();
    // rawMask has 1 byte per pixel after greyscale
    const cleanPixels = Buffer.alloc(origW * origH * 3);
    for (let i = 0; i < rawMask.length; i++) {
      const val = rawMask[i] > 128 ? 255 : 0;
      cleanPixels[i * 3] = val;
      cleanPixels[i * 3 + 1] = val;
      cleanPixels[i * 3 + 2] = val;
    }

    const finalMask = await sharp(cleanPixels, {
      raw: { width: origW, height: origH, channels: 3 },
    })
      .png()
      .toBuffer();

    const maskBase64 = `data:image/png;base64,${finalMask.toString("base64")}`;

    console.log("[detect-floor] Floor mask created:", origW, "x", origH);
    return NextResponse.json({ mask: maskBase64 });
  } catch (err) {
    console.error("[detect-floor] Error:", err);
    return NextResponse.json({ mask: null, fallback: true });
  }
}
