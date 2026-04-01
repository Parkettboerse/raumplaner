import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getProducts, saveProducts, slugify } from "@/lib/blob-products";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const productId = formData.get("productId") as string | null;
    const oldTextureUrl = formData.get("oldTextureUrl") as string | null;

    if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type))
      return NextResponse.json({ error: "Nur JPG, PNG, WebP" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "Max 5 MB" }, { status: 400 });

    // Delete old texture from Blob Storage if it's a blob URL
    if (oldTextureUrl && oldTextureUrl.includes("blob.vercel-storage.com")) {
      try {
        await del(oldTextureUrl);
        console.log("[upload-texture] Deleted old:", oldTextureUrl);
      } catch (e) {
        console.error("[upload-texture] Failed to delete old:", e);
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : "jpg";
    const safeName = productId ? slugify(productId) : String(Date.now());
    const timestamp = Date.now();
    const blobName = `textures/${safeName}-${timestamp}.${ext}`;

    const blob = await put(blobName, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.type,
    });

    console.log("[upload-texture] Uploaded:", blob.url);

    if (productId) {
      try {
        const products = await getProducts();
        const idx = products.findIndex((p: any) => p.id === productId);
        if (idx !== -1) {
          products[idx].texture_url = blob.url;
          await saveProducts(products);
          console.log("[upload-texture] Product updated:", productId);
        }
      } catch (e) {
        console.error("[upload-texture] Product update failed:", e);
      }
    }

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error: any) {
    console.error("[upload-texture] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
