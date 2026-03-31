import { NextRequest, NextResponse } from "next/server";
import convert from "heic-convert";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Keine Datei hochgeladen" },
      { status: 400 }
    );
  }

  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "Datei darf maximal 20 MB groß sein" },
      { status: 400 }
    );
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    const jpegBuffer = await convert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.85,
    });

    const base64 = `data:image/jpeg;base64,${Buffer.from(jpegBuffer).toString("base64")}`;
    return NextResponse.json({ image: base64 });
  } catch (err) {
    console.error("HEIC conversion error:", err);
    return NextResponse.json(
      { error: "HEIC-Konvertierung fehlgeschlagen. Bitte verwenden Sie JPG oder PNG." },
      { status: 500 }
    );
  }
}
