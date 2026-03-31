import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

const PRODUCTS_BLOB = "products.json";

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    // 1. List ALL blobs
    const allBlobs = await list();
    const allPaths = allBlobs.blobs.map((b) => b.pathname);

    // 2. Find texture blobs
    const textureBlobs = allBlobs.blobs
      .filter((b) => b.pathname.startsWith("textures/"))
      .map((b) => ({
        pathname: b.pathname,
        url: b.url,
        slug: (b.pathname.split("/").pop() || "").replace(/\.[^.]+$/, "").toLowerCase(),
      }));

    // 3. Load products from blob
    let products: any[] = [];
    const productsBlob = allBlobs.blobs.find((b) => b.pathname === PRODUCTS_BLOB);
    if (productsBlob) {
      const res = await fetch(productsBlob.url, { cache: "no-store" });
      if (res.ok) products = await res.json();
    }

    // 4. Match products to textures
    const report: any[] = [];
    for (const product of products) {
      const before = product.texture_url || "";
      const idSlug = slugify(product.id || "");
      const nameSlug = `${product.category}-${slugify(product.name)}`;

      let matched = textureBlobs.find(
        (b) => b.slug === idSlug || b.slug === nameSlug
      );
      if (!matched) {
        matched = textureBlobs.find(
          (b) => b.slug.includes(nameSlug) || nameSlug.includes(b.slug) ||
                 b.slug.includes(idSlug) || idSlug.includes(b.slug)
        );
      }

      if (matched) {
        product.texture_url = matched.url;
      }
      report.push({ id: product.id, name: product.name, idSlug, nameSlug, before, after: product.texture_url, matched: matched?.slug || null });
    }

    // 5. Save back
    if (products.length > 0) {
      await put(PRODUCTS_BLOB, JSON.stringify(products), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
    }

    return NextResponse.json({
      allBlobPaths: allPaths,
      textureBlobs: textureBlobs.map((b) => ({ slug: b.slug, url: b.url })),
      products: report,
    });
  } catch (error: any) {
    console.error("[fix-textures] Error:", error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
