import { put, list } from "@vercel/blob";

const BLOB_KEY = "products.json";

const SEED = [
  { id: "parkett-eiche-rustikal", name: "Eiche Rustikal", category: "parkett", detail: "Landhausdiele, gebürstet, naturgeölt, 14mm", price: "ab 54,90 €/m²", texture_url: "/textures/parkett-eiche-rustikal.png", shop_url: "https://www.parkettboerse.net/shop/parkett-eiche-rustikal" },
  { id: "parkett-nussbaum-elegance", name: "Nussbaum Elegance", category: "parkett", detail: "2-Schicht-Diele, UV-geölt, 11mm", price: "ab 89,00 €/m²", texture_url: "/textures/parkett-nussbaum-elegance.png", shop_url: "https://www.parkettboerse.net/shop/parkett-nussbaum-elegance" },
  { id: "vinyl-eiche-grau", name: "Vinyl Eiche Grau", category: "vinyl", detail: "Klick-Vinyl, 5mm, NK 33, Trittschall integriert", price: "ab 34,90 €/m²", texture_url: "/textures/vinyl-eiche-grau.png", shop_url: "https://www.parkettboerse.net/shop/vinyl-eiche-grau" },
  { id: "vinyl-steinoptik-anthrazit", name: "Vinyl Steinoptik Anthrazit", category: "vinyl", detail: "Klick-Vinyl, Fliesenformat, 5mm, NK 33, wasserbeständig", price: "ab 38,50 €/m²", texture_url: "/textures/vinyl-steinoptik-anthrazit.png", shop_url: "https://www.parkettboerse.net/shop/vinyl-steinoptik-anthrazit" },
];

// In-memory for dev (no Blob token)
let memStore: any[] | null = null;

function hasToken(): boolean {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  return !!t && t !== "vercel_blob_token_hier" && t.trim() !== "";
}

export async function getProducts(): Promise<any[]> {
  if (!hasToken()) {
    if (!memStore) memStore = [...SEED];
    return memStore;
  }

  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, { cache: "no-store" });
      if (res.ok) return await res.json();
    }
    // No blob yet — seed it
    await saveProducts(SEED);
    return SEED;
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
    contentType: "application/json",
  });
}
