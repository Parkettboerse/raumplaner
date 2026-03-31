import { FloorProduct } from "@/types";
import { put, list, del } from "@vercel/blob";
import fs from "fs";
import path from "path";

const BLOB_PATH = "data/products.json";
const LOCAL_PATH = path.join(process.cwd(), "src/data/products.json");

/**
 * Check if Blob Storage is configured.
 */
function hasBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return !!token && token !== "vercel_blob_token_hier" && token.trim() !== "";
}

/**
 * Read products — from Blob Storage if available, otherwise local file.
 */
export async function getProducts(): Promise<FloorProduct[]> {
  if (hasBlobToken()) {
    try {
      const { blobs } = await list({ prefix: BLOB_PATH });
      const blob = blobs.find((b) => b.pathname === BLOB_PATH);
      if (blob) {
        const res = await fetch(blob.url);
        if (res.ok) {
          return await res.json();
        }
      }
      // No blob yet — return local seed data and upload it
      const seed = readLocal();
      await saveProducts(seed);
      return seed;
    } catch (err) {
      console.error("[products] Blob read failed, falling back to local:", err);
      return readLocal();
    }
  }
  return readLocal();
}

/**
 * Save products — to Blob Storage if available, otherwise local file.
 */
export async function saveProducts(products: FloorProduct[]): Promise<void> {
  const json = JSON.stringify(products, null, 2);

  if (hasBlobToken()) {
    try {
      await put(BLOB_PATH, json, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      return;
    } catch (err) {
      console.error("[products] Blob write failed, falling back to local:", err);
    }
  }

  // Local fallback (dev mode)
  ensureLocalDir();
  fs.writeFileSync(LOCAL_PATH, json, "utf-8");
}

function readLocal(): FloorProduct[] {
  ensureLocalDir();
  if (!fs.existsSync(LOCAL_PATH)) {
    fs.writeFileSync(LOCAL_PATH, "[]", "utf-8");
  }
  return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8"));
}

function ensureLocalDir() {
  const dir = path.dirname(LOCAL_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
