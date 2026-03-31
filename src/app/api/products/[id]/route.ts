import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProduct, deleteProduct } from "@/lib/products";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (err) {
    console.error("[api/products/id GET]", err);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await updateProduct(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/products/id PUT]", err);
    return NextResponse.json({ error: "Produkt konnte nicht aktualisiert werden" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await deleteProduct(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/products/id DELETE]", err);
    return NextResponse.json({ error: "Produkt konnte nicht gelöscht werden" }, { status: 500 });
  }
}
