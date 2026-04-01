import { NextResponse } from "next/server";
import { getProducts, saveProducts } from "@/lib/blob-products";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
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
      product.category + "-" + product.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
    products.push(product);
    await saveProducts(products);
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("POST products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
