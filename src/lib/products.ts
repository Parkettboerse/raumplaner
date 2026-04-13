import { FloorProduct } from "@/types";
import { put, list } from "@vercel/blob";

const BLOB_PATH = "data/products.json";

function hasBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return !!token && token !== "vercel_blob_token_hier" && token.trim() !== "";
}

// In-memory store for dev mode
let memoryStore: FloorProduct[] | null = null;

const FALLBACK_SEED: FloorProduct[] = [];

export async function getProducts(): Promise<FloorProduct[]> {
  const useBlob = hasBlobToken();
  console.log("[products] getProducts, blob:", useBlob);

  if (useBlob) {
    try {
      const { blobs } = await list({ prefix: "data/" });
      const blob = blobs.find((b) => b.pathname === BLOB_PATH);

      if (blob) {
        const res = await fetch(blob.url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          console.log("[products] Loaded", data.length, "from blob");
          return data;
        }
        console.error("[products] Blob fetch status:", res.status);
      } else {
        console.log("[products] No blob yet, seeding...");
        await saveProducts(FALLBACK_SEED);
        return FALLBACK_SEED;
      }
    } catch (err: any) {
      console.error("[products] Blob error:", err?.message);
    }
    return FALLBACK_SEED;
  }

  // Dev: in-memory
  if (!memoryStore) memoryStore = [...FALLBACK_SEED];
  return memoryStore;
}

export async function saveProducts(products: FloorProduct[]): Promise<void> {
  const useBlob = hasBlobToken();
  console.log("[products] saveProducts,", products.length, "items, blob:", useBlob);

  if (useBlob) {
    const result = await put(BLOB_PATH, JSON.stringify(products, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    console.log("[products] Saved to:", result.url);
    return;
  }

  memoryStore = products;
}

export async function getProductById(id: string): Promise<FloorProduct | undefined> {
  return (await getProducts()).find((p) => p.id === id);
}

export async function addProduct(product: FloorProduct): Promise<FloorProduct> {
  const all = await getProducts();
  all.push(product);
  await saveProducts(all);
  return product;
}

export async function upsertProduct(product: FloorProduct): Promise<FloorProduct> {
  const all = await getProducts();
  const idx = all.findIndex((p) => p.id === product.id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...product };
  } else {
    all.push(product);
  }
  await saveProducts(all);
  return idx !== -1 ? all[idx] : product;
}

export async function updateProduct(id: string, data: Partial<FloorProduct>): Promise<FloorProduct | null> {
  const all = await getProducts();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, id };
  await saveProducts(all);
  return all[idx];
}

export async function deleteProduct(id: string): Promise<boolean> {
  const all = await getProducts();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  await saveProducts(filtered);
  return true;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
