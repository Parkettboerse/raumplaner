import { NextRequest, NextResponse } from "next/server";
import { getProducts, addProduct } from "@/lib/products";
import { FloorProduct } from "@/types";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (err) {
    console.error("[api/products GET]", err);
    return NextResponse.json(
      { error: "Produkte konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const required: (keyof FloorProduct)[] = [
      "id", "name", "category", "detail", "price", "shop_url",
    ];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Feld "${field}" fehlt` },
          { status: 400 }
        );
      }
    }

    const validCategories = ["parkett", "vinyl", "laminat", "kork"];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: "Ungültige Kategorie" },
        { status: 400 }
      );
    }

    const product: FloorProduct = {
      id: body.id,
      name: body.name,
      category: body.category,
      detail: body.detail,
      price: body.price,
      texture_url: body.texture_url || "",
      shop_url: body.shop_url,
    };

    await addProduct(product);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[api/products POST]", err);
    return NextResponse.json(
      { error: "Produkt konnte nicht gespeichert werden" },
      { status: 500 }
    );
  }
}
