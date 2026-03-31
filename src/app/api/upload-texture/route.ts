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

    console.log("[upload-texture] File:", file.name, "type:", file.type, "size:", file.size);
    console.log("[upload-texture] BLOB_READ_WRITE_TOKEN set:", !!process.env.BLOB_READ_WRITE_TOKEN);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Typ "${file.type}" nicht erlaubt. Nur JPG, PNG, WebP.` }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Datei darf maximal 5 MB groß sein" }, { status: 400 });
    }

    // Convert File to Buffer for reliable Blob Storage upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.type === "image/png" ? "png" : "jpg";
    const blobName = productId
      ? `textures/${productId}.${ext}`
      : `textures/${Date.now()}.${ext}`;

    console.log("[upload-texture] Uploading to blob:", blobName, "buffer size:", buffer.length);

    const blob = await put(blobName, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    console.log("[upload-texture] Success:", blob.url);

    // Update product texture_url if productId provided
    if (productId) {
      try {
        const product = await getProductById(productId);
        if (product) {
          await updateProduct(productId, { texture_url: blob.url });
          console.log("[upload-texture] Product texture_url updated");
        }
      } catch (updateErr) {
        // Image uploaded successfully, but product update failed — not critical
        console.error("[upload-texture] Product update failed (image still uploaded):", updateErr);
      }
    }

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err: any) {
    console.error("[upload-texture] FULL ERROR:", err?.message, err?.stack);
    const detail = err?.message || "Unbekannter Fehler";
    return NextResponse.json(
      { error: `Bild-Upload fehlgeschlagen: ${detail}` },
      { status: 500 }
    );
  }
}
