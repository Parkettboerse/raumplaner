import { NextRequest, NextResponse } from "next/server";
import { getProducts, saveProducts } from "@/lib/blob-products";

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parseCSV(text: string): string[][] {
  return text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
    const result: string[] = [];
    let current = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) { if (c === '"' && line[i+1] === '"') { current += '"'; i++; } else if (c === '"') inQ = false; else current += c; }
      else { if (c === '"') inQ = true; else if (c === ";" || c === ",") { result.push(current.trim()); current = ""; } else current += c; }
    }
    result.push(current.trim());
    return result;
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Keine CSV" }, { status: 400 });

    const rows = parseCSV(await file.text());
    if (rows.length < 2) return NextResponse.json({ error: "CSV leer" }, { status: 400 });

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const skuIdx = header.findIndex((h) => h === "sku" || h === "artikelnummer" || h === "art.-nr." || h === "artnr");
    const nameIdx = header.findIndex((h) => h === "name");
    const catIdx = header.findIndex((h) => h === "kategorie" || h === "category");
    const detailIdx = header.findIndex((h) => h === "detail");
    const priceIdx = header.findIndex((h) => h === "preis" || h === "price");
    const shopIdx = header.findIndex((h) => h.includes("shop") || h.includes("url"));
    const masseIdx = header.findIndex((h) => h === "maße" || h === "masse" || h === "maβe" || h === "dimensions");
    const oberfIdx = header.findIndex((h) => h === "oberflaeche" || h === "oberfläche" || h.includes("oberfla"));
    const formatIdx = header.findIndex((h) => h === "format");
    const verlIdx = header.findIndex((h) => h === "verlegemuster" || h.includes("verlege"));

    if (nameIdx === -1 || catIdx === -1)
      return NextResponse.json({ error: 'Spalten "Name" und "Kategorie" fehlen' }, { status: 400 });

    const products = await getProducts();
    const imported: any[] = [];
    const errors: string[] = [];
    const validCats = ["parkett", "vinyl", "laminat", "kork"];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameIdx] || "";
      const category = (row[catIdx] || "").toLowerCase().trim();
      if (!name) { errors.push(`Zeile ${i+1}: Name fehlt`); continue; }
      if (!validCats.includes(category)) { errors.push(`Zeile ${i+1}: Ungültige Kategorie`); continue; }

      const sku = skuIdx !== -1 ? (row[skuIdx] || "").trim() : "";
      const id = `${category}-${slugify(name)}`;
      const product: any = {
        id, name, category,
        detail: detailIdx !== -1 ? row[detailIdx] || "" : "",
        price: priceIdx !== -1 ? row[priceIdx] || "" : "",
        texture_url: "",
        shop_url: shopIdx !== -1 ? row[shopIdx] || "" : "",
      };
      if (sku) product.sku = sku;
      if (masseIdx !== -1 && row[masseIdx]) product.masse = row[masseIdx].trim();
      if (oberfIdx !== -1 && row[oberfIdx]) product.oberflaeche = row[oberfIdx].trim();
      if (formatIdx !== -1 && row[formatIdx]) product.format = row[formatIdx].trim();
      if (verlIdx !== -1 && row[verlIdx]) product.verlegemuster = row[verlIdx].trim();

      // Match by SKU first, then by ID
      let existing = sku ? products.findIndex((p: any) => p.sku === sku) : -1;
      if (existing === -1) existing = products.findIndex((p: any) => p.id === id);
      if (existing !== -1) products[existing] = { ...products[existing], ...product };
      else products.push(product);
      imported.push(product);
    }

    await saveProducts(products);
    return NextResponse.json({ imported: imported.length, errors, products: imported });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
