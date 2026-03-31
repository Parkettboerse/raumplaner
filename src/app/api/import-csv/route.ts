import { NextRequest, NextResponse } from "next/server";
import { upsertProduct, slugify, getProducts } from "@/lib/products";
import { FloorProduct } from "@/types";

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ";" || char === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  });
}

const VALID_CATEGORIES = ["parkett", "vinyl", "laminat", "kork"];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Keine CSV-Datei hochgeladen" },
      { status: 400 }
    );
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV enthält keine Datenzeilen" },
      { status: 400 }
    );
  }

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const nameIdx = header.findIndex((h) => h === "name");
  const catIdx = header.findIndex((h) =>
    h === "kategorie" || h === "category"
  );
  const detailIdx = header.findIndex((h) => h === "detail");
  const priceIdx = header.findIndex((h) =>
    h === "preis" || h === "price"
  );
  const shopIdx = header.findIndex((h) =>
    h.includes("shop") || h.includes("url")
  );

  if (nameIdx === -1 || catIdx === -1) {
    return NextResponse.json(
      {
        error:
          'Pflicht-Spalten "Name" und "Kategorie" nicht gefunden. Erwartete Spalten: Name, Kategorie, Detail, Preis, Shop-URL',
      },
      { status: 400 }
    );
  }

  const dataRows = rows.slice(1);
  const existingProducts = await getProducts();
  const existingIds = new Set(existingProducts.map((p) => p.id));

  const imported: FloorProduct[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const name = row[nameIdx] || "";
    const category = (row[catIdx] || "").toLowerCase().trim();

    if (!name) {
      errors.push(`Zeile ${i + 2}: Name fehlt`);
      continue;
    }
    if (!VALID_CATEGORIES.includes(category)) {
      errors.push(
        `Zeile ${i + 2}: Ungültige Kategorie "${category}"`
      );
      continue;
    }

    const baseSlug = `${category}-${slugify(name)}`;
    let id = baseSlug;
    // Add numeric suffix to avoid collisions within this import batch
    const batchIds = new Set(imported.map((p) => p.id));
    if (existingIds.has(id) || batchIds.has(id)) {
      // Keep the same ID for upsert if it already exists
      if (!existingIds.has(id)) {
        let counter = 2;
        while (existingIds.has(`${baseSlug}-${counter}`) || batchIds.has(`${baseSlug}-${counter}`)) {
          counter++;
        }
        id = `${baseSlug}-${counter}`;
      }
    }

    const product: FloorProduct = {
      id,
      name,
      category: category as FloorProduct["category"],
      detail: detailIdx !== -1 ? row[detailIdx] || "" : "",
      price: priceIdx !== -1 ? row[priceIdx] || "" : "",
      texture_url: "",
      shop_url: shopIdx !== -1 ? row[shopIdx] || "" : "",
    };

    await upsertProduct(product);
    imported.push(product);
  }

  return NextResponse.json({
    imported: imported.length,
    errors,
    products: imported,
  });
}
