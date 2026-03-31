import { FloorProduct } from "@/types";
import { put, list } from "@vercel/blob";

const BLOB_PATH = "data/products.json";

function hasBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return !!token && token !== "vercel_blob_token_hier" && token.trim() !== "";
}

// In-memory fallback for dev without Blob token
let memoryStore: FloorProduct[] | null = null;

function getLocalSeed(): FloorProduct[] {
  // Dynamic require to avoid issues on Vercel where the file may not exist
  try {
    return require("@/data/products.json") as FloorProduct[];
  } catch {
    return [];
  }
}

export async function getProducts(): Promise<FloorProduct[]> {
  if (hasBlobToken()) {
    try {
      const { blobs } = await list({ prefix: BLOB_PATH });
      const blob = blobs.find((b) => b.pathname === BLOB_PATH);
      if (blob) {
        const res = await fetch(blob.url, { cache: "no-store" });
        if (res.ok) return await res.json();
      }
      // No blob yet — seed from bundled data
      const seed = getLocalSeed();
      if (seed.length > 0) {
        await saveProducts(seed);
      }
      return seed;
    } catch (err) {
      console.error("[products] Blob read error:", err);
      return getLocalSeed();
    }
  }

  // Dev mode: in-memory store seeded from local file
  if (memoryStore === null) {
    memoryStore = getLocalSeed();
  }
  return memoryStore;
}

export async function saveProducts(products: FloorProduct[]): Promise<void> {
  if (hasBlobToken()) {
    await put(BLOB_PATH, JSON.stringify(products, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }

  // Dev mode: save to memory
  memoryStore = products;
}

export async function getProductById(
  id: string
): Promise<FloorProduct | undefined> {
  const products = await getProducts();
  return products.find((p) => p.id === id);
}

export async function addProduct(
  product: FloorProduct
): Promise<FloorProduct> {
  const products = await getProducts();
  products.push(product);
  await saveProducts(products);
  return product;
}

export async function upsertProduct(
  product: FloorProduct
): Promise<FloorProduct> {
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index !== -1) {
    products[index] = { ...products[index], ...product };
  } else {
    products.push(product);
  }
  await saveProducts(products);
  return index !== -1 ? products[index] : product;
}

export async function updateProduct(
  id: string,
  data: Partial<FloorProduct>
): Promise<FloorProduct | null> {
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...data, id };
  await saveProducts(products);
  return products[index];
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await getProducts();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) return false;
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
