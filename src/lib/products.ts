import { FloorProduct } from "@/types";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src/data/products.json");

function ensureFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, "[]", "utf-8");
  }
}

export function getProducts(): FloorProduct[] {
  ensureFile();
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

export function saveProducts(products: FloorProduct[]) {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(products, null, 2), "utf-8");
}

export function getProductById(id: string): FloorProduct | undefined {
  return getProducts().find((p) => p.id === id);
}

export function addProduct(product: FloorProduct): FloorProduct {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
  return product;
}

export function upsertProduct(product: FloorProduct): FloorProduct {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index !== -1) {
    products[index] = { ...products[index], ...product };
  } else {
    products.push(product);
  }
  saveProducts(products);
  return index !== -1 ? products[index] : product;
}

export function updateProduct(
  id: string,
  data: Partial<FloorProduct>
): FloorProduct | null {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...data, id };
  saveProducts(products);
  return products[index];
}

export function deleteProduct(id: string): boolean {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) return false;
  saveProducts(filtered);
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
