import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (char === '"') { inQuotes = false; }
        else { current += char; }
      } else {
        if (char === '"') { inQuotes = true; }
        else if (char === ";" || char === ",") { result.push(current.trim()); current = ""; }
        else { current += char; }
      }
    }
    result.push(current.trim());
    return result;
  });
}

const VALID_CATEGORIES = ["parkett", "vinyl", "laminat", "kork"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine CSV-Datei hochgeladen" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV enthält keine Datenzeilen" }, { status: 400 });
    }

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const nameIdx = header.findIndex((h) => h === "name");
    const catIdx = header.findIndex((h) => h === "kategorie" || h === "category");
    const detailIdx = header.findIndex((h) => h === "detail");
    const priceIdx = header.findIndex((h) => h === "preis" || h === "price");
    const shopIdx = header.findIndex((h) => h.includes("shop") || h.includes("url"));

    if (nameIdx === -1 || catIdx === -1) {
      return NextResponse.json({
        error: 'Pflicht-Spalten "Name" und "Kategorie" nicht gefunden.',
      }, { status: 400 });
    }

    const products = await getProducts();
    const existingIds = new Set(products.map((p: any) => p.id));
    const imported: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameIdx] || "";
      const category = (row[catIdx] || "").toLowerCase().trim();

      if (!name) { errors.push(`Zeile ${i + 1}: Name fehlt`); continue; }
      if (!VALID_CATEGORIES.includes(category)) { errors.push(`Zeile ${i + 1}: Ungültige Kategorie "${category}"`); continue; }

      let id = `${category}-${slugify(name)}`;
      const batchIds = new Set(imported.map((p) => p.id));

      // If ID exists, update existing; if collision in batch, add suffix
      if (!existingIds.has(id) && batchIds.has(id)) {
        let c = 2;
        while (batchIds.has(`${id}-${c}`)) c++;
        id = `${id}-${c}`;
      }

      const product = {
        id,
        name,
        category,
        detail: detailIdx !== -1 ? row[detailIdx] || "" : "",
        price: priceIdx !== -1 ? row[priceIdx] || "" : "",
        texture_url: "",
        shop_url: shopIdx !== -1 ? row[shopIdx] || "" : "",
      };

      // Upsert: update if exists, add if new
      const existIdx = products.findIndex((p: any) => p.id === id);
      if (existIdx !== -1) {
        products[existIdx] = { ...products[existIdx], ...product };
      } else {
        products.push(product);
      }
      imported.push(product);
    }

    await saveProducts(products);

    return NextResponse.json({ imported: imported.length, errors, products: imported });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
