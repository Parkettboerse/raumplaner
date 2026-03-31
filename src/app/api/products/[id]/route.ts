import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const products = await getProducts();
    const product = products.find((p: any) => p.id === params.id);
    if (!product) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("GET product error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const products = await getProducts();
    const index = products.findIndex((p: any) => p.id === params.id);
    if (index === -1) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    products[index] = { ...products[index], ...body, id: params.id };
    await saveProducts(products);
    return NextResponse.json(products[index]);
  } catch (error: any) {
    console.error("PUT product error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const products = await getProducts();
    const filtered = products.filter((p: any) => p.id !== params.id);
    if (filtered.length === products.length) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    await saveProducts(filtered);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE product error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
