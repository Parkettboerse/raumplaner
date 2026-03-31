import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const jpegBuffer = await sharp(buffer)
      .jpeg({ quality: 85 })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
    return NextResponse.json({ image: base64 });
  } catch (err) {
    console.error("Image conversion error:", err);
    return NextResponse.json(
      { error: "Bildkonvertierung fehlgeschlagen. Bitte verwenden Sie JPG oder PNG." },
      { status: 500 }
    );
  }
}
