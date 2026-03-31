import { NextRequest, NextResponse } from "next/server";
import { getProducts, saveProducts } from "@/lib/blob-products";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const products = await getProducts();
    const product = products.find((p: any) => p.id === params.id);
    if (!product) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error: any) {
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
    const idx = products.findIndex((p: any) => p.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    products[idx] = { ...products[idx], ...body, id: params.id };
    await saveProducts(products);
    return NextResponse.json(products[idx]);
  } catch (error: any) {
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
    if (filtered.length === products.length) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    await saveProducts(filtered);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
