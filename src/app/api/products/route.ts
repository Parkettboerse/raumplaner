import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error: any) {
    console.error("GET products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const product = await request.json();
    const products = await getProducts();
    product.id =
      product.id ||
      product.category +
        "-" +
        product.name.toLowerCase().replace(/[^a-z0-9]/g, "-") +
        "-" +
        Date.now();
    products.push(product);
    await saveProducts(products);
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("POST products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
