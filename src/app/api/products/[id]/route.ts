import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProduct, deleteProduct } from "@/lib/products";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await getProductById(params.id);
  if (!product) {
    return NextResponse.json(
      { error: "Produkt nicht gefunden" },
      { status: 404 }
    );
  }
  return NextResponse.json(product);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const updated = await updateProduct(params.id, body);
  if (!updated) {
    return NextResponse.json(
      { error: "Produkt nicht gefunden" },
      { status: 404 }
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deleted = await deleteProduct(params.id);
  if (!deleted) {
    return NextResponse.json(
      { error: "Produkt nicht gefunden" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
