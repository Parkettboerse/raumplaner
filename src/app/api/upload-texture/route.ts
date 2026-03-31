import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { updateProduct, getProductById } from "@/lib/products";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const productId = formData.get("productId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Nur JPG, PNG und WebP erlaubt" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Datei darf maximal 5 MB groß sein" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const blobName = productId
      ? `textures/${productId}.${ext}`
      : `textures/${Date.now()}.${ext}`;

    console.log("[upload-texture] Uploading", blobName, "size:", file.size);

    const blob = await put(blobName, file, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log("[upload-texture] Uploaded to:", blob.url);

    if (productId) {
      const product = await getProductById(productId);
      if (product) {
        await updateProduct(productId, { texture_url: blob.url });
        console.log("[upload-texture] Updated product texture_url");
      }
    }

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error("[upload-texture] Error:", err);
    return NextResponse.json(
      { error: "Bild-Upload fehlgeschlagen. Bitte prüfen Sie die Blob Storage Konfiguration." },
      { status: 500 }
    );
  }
}
