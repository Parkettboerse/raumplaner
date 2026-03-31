import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { getProducts, saveProducts, slugify } from "@/lib/blob-products";

export async function GET() {
  try {
    // 1. List all texture blobs
    const { blobs } = await list({ prefix: "textures/" });
    const textureBlobs = blobs.map((b) => ({
      pathname: b.pathname,
      url: b.url,
      name: (b.pathname.split("/").pop() || "").replace(/\.[^.]+$/, "").toLowerCase(),
    }));

    // 2. Load products
    const products = await getProducts();

    // 3. Match each product to a texture blob
    const results: { id: string; matched: string | null; before: string }[] = [];

    for (const product of products) {
      const before = product.texture_url || "";
      const productSlug = slugify(product.id || "");
      const nameSlug = `${product.category}-${slugify(product.name)}`;

      // Try exact match, then contains match
      let match = textureBlobs.find(
        (b) => b.name === productSlug || b.name === nameSlug
      );

      if (!match) {
        match = textureBlobs.find(
          (b) => b.name.includes(nameSlug) || nameSlug.includes(b.name) ||
                 b.name.includes(productSlug) || productSlug.includes(b.name)
        );
      }

      if (match) {
        product.texture_url = match.url;
        results.push({ id: product.id, matched: match.url, before });
      } else {
        results.push({ id: product.id, matched: null, before });
      }
    }

    // 4. Save updated products
    await saveProducts(products);

    return NextResponse.json({
      textureBlobs: textureBlobs.map((b) => ({ name: b.name, url: b.url })),
      products: results,
      totalProducts: products.length,
      matched: results.filter((r) => r.matched).length,
    });
  } catch (error: any) {
    console.error("[fix-textures]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
