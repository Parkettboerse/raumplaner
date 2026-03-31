import { FloorProduct } from "@/types";
import { put, list } from "@vercel/blob";

const BLOB_PATH = "data/products.json";

function hasBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return !!token && token !== "vercel_blob_token_hier" && token.trim() !== "";
}

// In-memory fallback for dev without Blob token
let memoryStore: FloorProduct[] | null = null;

// Bundled seed data (imported at build time, works on Vercel)
import seedData from "@/data/products.json";
const SEED_DATA: FloorProduct[] = seedData as FloorProduct[];

export async function getProducts(): Promise<FloorProduct[]> {
  console.log("[products] getProducts called, hasBlobToken:", hasBlobToken());

  if (hasBlobToken()) {
    try {
      const { blobs } = await list({ prefix: "data/" });
      console.log("[products] Blobs found:", blobs.map((b) => b.pathname));
      const blob = blobs.find((b) => b.pathname === BLOB_PATH);

      if (blob) {
        const res = await fetch(blob.url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          console.log("[products] Loaded", data.length, "products from Blob");
          return data;
        }
        console.error("[products] Blob fetch failed:", res.status);
      }

      // No blob yet — seed from bundled data
      console.log("[products] No blob found, seeding with", SEED_DATA.length, "products");
      if (SEED_DATA.length > 0) {
        await saveProducts(SEED_DATA);
      }
      return SEED_DATA;
    } catch (err: any) {
      console.error("[products] Blob read error:", err?.message, err?.stack);
      return SEED_DATA;
    }
  }

  // Dev mode: in-memory store
  if (memoryStore === null) {
    memoryStore = [...SEED_DATA];
  }
  return memoryStore;
}

export async function saveProducts(products: FloorProduct[]): Promise<void> {
  console.log("[products] saveProducts called,", products.length, "products, hasBlobToken:", hasBlobToken());

  if (hasBlobToken()) {
    try {
      const result = await put(BLOB_PATH, JSON.stringify(products, null, 2), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      console.log("[products] Saved to Blob:", result.url);
      return;
    } catch (err: any) {
      console.error("[products] Blob write FAILED:", err?.message, err?.stack);
      throw err; // Re-throw so caller knows it failed
    }
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
