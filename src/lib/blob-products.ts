import { put, list } from "@vercel/blob";

const BLOB_KEY = "products.json";

const SEED = [
  { id: "parkett-eiche-rustikal", name: "Eiche Rustikal", category: "parkett", detail: "Landhausdiele, gebürstet, naturgeölt, 14mm", price: "ab 54,90 €/m²", texture_url: "/textures/parkett-eiche-rustikal.png", shop_url: "https://www.parkettboerse.net/shop/parkett-eiche-rustikal" },
  { id: "parkett-nussbaum-elegance", name: "Nussbaum Elegance", category: "parkett", detail: "2-Schicht-Diele, UV-geölt, 11mm", price: "ab 89,00 €/m²", texture_url: "/textures/parkett-nussbaum-elegance.png", shop_url: "https://www.parkettboerse.net/shop/parkett-nussbaum-elegance" },
  { id: "vinyl-eiche-grau", name: "Vinyl Eiche Grau", category: "vinyl", detail: "Klick-Vinyl, 5mm, NK 33, Trittschall integriert", price: "ab 34,90 €/m²", texture_url: "/textures/vinyl-eiche-grau.png", shop_url: "https://www.parkettboerse.net/shop/vinyl-eiche-grau" },
  { id: "vinyl-steinoptik-anthrazit", name: "Vinyl Steinoptik Anthrazit", category: "vinyl", detail: "Klick-Vinyl, Fliesenformat, 5mm, NK 33, wasserbeständig", price: "ab 38,50 €/m²", texture_url: "/textures/vinyl-steinoptik-anthrazit.png", shop_url: "https://www.parkettboerse.net/shop/vinyl-steinoptik-anthrazit" },
];

let memStore: any[] | null = null;

function hasToken(): boolean {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  return !!t && t !== "vercel_blob_token_hier" && t.trim() !== "";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Auto-match products without texture_url to existing texture blobs.
 * Looks for blobs under textures/ that match the product's slug.
 */
async function matchTextures(products: any[]): Promise<boolean> {
  // Products need matching if texture_url is empty OR is a local path (not a blob URL)
  const missing = products.filter(
    (p) => !p.texture_url || (!p.texture_url.startsWith("http") && p.texture_url.startsWith("/"))
  );
  if (missing.length === 0) return false;

  try {
    const { blobs } = await list({ prefix: "textures/" });
    if (blobs.length === 0) return false;

    // Build a map: lowercase filename (without ext) → blob URL
    const blobMap = new Map<string, string>();
    for (const b of blobs) {
      // pathname like "textures/parkett-eiche-rustikal.jpg"
      const filename = b.pathname.split("/").pop() || "";
      const nameWithoutExt = filename.replace(/\.[^.]+$/, "").toLowerCase();
      blobMap.set(nameWithoutExt, b.url);
    }

    let changed = false;
    for (const product of missing) {
      // Try matching by product ID first, then by category-slugified-name
      const slug1 = product.id?.toLowerCase();
      const slug2 = `${product.category}-${slugify(product.name)}`;

      const url = blobMap.get(slug1) || blobMap.get(slug2);
      if (url) {
        product.texture_url = url;
        changed = true;
        console.log("[blob-products] Matched texture for", product.id, "→", url);
      } else {
        // Fuzzy: check if any blob filename CONTAINS the product slug
        blobMap.forEach((blobUrl, key) => {
          if (!product.texture_url && (key.includes(slug2) || slug2.includes(key))) {
            product.texture_url = blobUrl;
            changed = true;
            console.log("[blob-products] Fuzzy-matched texture for", product.id, "→", blobUrl);
          }
        });
      }
    }

    return changed;
  } catch (err) {
    console.error("[blob-products] matchTextures error:", err);
    return false;
  }
}

export async function getProducts(): Promise<any[]> {
  if (!hasToken()) {
    if (!memStore) memStore = [...SEED];
    return memStore;
  }

  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    let products: any[];

    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, { cache: "no-store" });
      if (res.ok) {
        products = await res.json();
      } else {
        products = [...SEED];
      }
    } else {
      products = [...SEED];
      await saveProducts(products);
    }

    // Auto-match textures for products without texture_url
    const changed = await matchTextures(products);
    if (changed) {
      await saveProducts(products);
    }

    return products;
  } catch (err) {
    console.error("[blob-products] read error:", err);
    return SEED;
  }
}

export async function saveProducts(products: any[]): Promise<void> {
  if (!hasToken()) {
    memStore = products;
    return;
  }

  await put(BLOB_KEY, JSON.stringify(products), {
    access: "public",
    addRandomSuffix: false,
      allowOverwrite: true,
    contentType: "application/json",
  });
}
