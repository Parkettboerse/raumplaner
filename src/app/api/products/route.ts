import { NextRequest, NextResponse } from "next/server";
import { getProducts, addProduct } from "@/lib/products";
import { FloorProduct } from "@/types";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (err: any) {
    console.error("[api/products GET] FULL ERROR:", err?.message, err?.stack);
    return NextResponse.json(
      { error: "Produkte konnten nicht geladen werden: " + (err?.message || "") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[api/products POST] Body:", JSON.stringify(body).slice(0, 200));

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
    console.log("[api/products POST] Product saved:", product.id);
    return NextResponse.json(product, { status: 201 });
  } catch (err: any) {
    console.error("[api/products POST] FULL ERROR:", err?.message, err?.stack);
    return NextResponse.json(
      { error: "Produkt konnte nicht gespeichert werden: " + (err?.message || "") },
      { status: 500 }
    );
  }
}
