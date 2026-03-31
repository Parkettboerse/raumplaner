import { NextRequest, NextResponse } from "next/server";
import { getProducts, addProduct } from "@/lib/products";
import { FloorProduct } from "@/types";

export async function GET() {
  const products = getProducts();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const required: (keyof FloorProduct)[] = [
    "id",
    "name",
    "category",
    "detail",
    "price",
    "shop_url",
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

  addProduct(product);
  return NextResponse.json(product, { status: 201 });
}
