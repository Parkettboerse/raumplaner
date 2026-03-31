import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const PRODUCTS_KEY = "products.json";

async function getProducts() {
  try {
    const { blobs } = await list({ prefix: PRODUCTS_KEY });
    if (blobs.length === 0) return [];
    const response = await fetch(blobs[0].url);
    return await response.json();
  } catch {
    return [];
  }
}

async function saveProducts(products: any[]) {
  await put(PRODUCTS_KEY, JSON.stringify(products), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

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

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Datei darf maximal 5 MB groß sein" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : "jpg";
    const blobName = productId
      ? `textures/${productId}.${ext}`
      : `textures/${Date.now()}.${ext}`;

    console.log("[upload-texture] Uploading", blobName, buffer.length, "bytes");

    const blob = await put(blobName, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    console.log("[upload-texture] Done:", blob.url);

    // Update product texture_url
    if (productId) {
      try {
        const products = await getProducts();
        const idx = products.findIndex((p: any) => p.id === productId);
        if (idx !== -1) {
          products[idx].texture_url = blob.url;
          await saveProducts(products);
        }
      } catch (e) {
        console.error("[upload-texture] Product update failed:", e);
      }
    }

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error: any) {
    console.error("[upload-texture] Error:", error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
