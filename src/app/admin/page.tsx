"use client";

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { FloorProduct } from "@/types";

type Category = FloorProduct["category"];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "parkett", label: "Parkett" },
  { value: "vinyl", label: "Vinyl" },
  { value: "laminat", label: "Laminat" },
  { value: "kork", label: "Kork" },
];

const emptyForm = {
  name: "",
  category: "parkett" as Category,
  detail: "",
  price: "",
  shop_url: "",
  format: "",
  dimensions: "",
  verlegemuster: "",
  oberflaeche: "",
};

function compressImageFile(file: File, maxWidth = 512, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas error")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    ),
  ]);
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

// ─── CSV Parser (client-side for preview) ───
function parseCSVClient(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";" || ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export default function AdminPage() {
  // ─── Auth ───
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // ─── Products ───
  const [products, setProducts] = useState<FloorProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "alle">("alle");

  // ─── Product Form ───
  const [form, setForm] = useState(emptyForm);
  const [textureFile, setTextureFile] = useState<File | null>(null);
  const [currentTextureUrl, setCurrentTextureUrl] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // ─── CSV Import ───
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);

  // ─── Texture upload refs per row ───
  const textureInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTextureId, setUploadingTextureId] = useState<string | null>(null);

  // ────────────────────────────────────────
  // Auth
  // ────────────────────────────────────────
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
      localStorage.setItem("admin_auth", "1");
    } else {
      setAuthError("Falsches Passwort");
    }
  }

  useEffect(() => {
    if (localStorage.getItem("admin_auth") === "1") {
      setAuthenticated(true);
    }
  }, []);

  // ────────────────────────────────────────
  // Products
  // ────────────────────────────────────────
  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setProducts(data);
      } else {
        flash(data.error || "Produkte konnten nicht geladen werden", "err");
      }
    } catch {
      flash("Netzwerkfehler beim Laden der Produkte", "err");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authenticated) fetchProducts();
  }, [authenticated]);

  function flash(text: string, type: "ok" | "err" = "ok") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  const filteredProducts =
    filterCategory === "alle"
      ? products
      : products.filter((p) => p.category === filterCategory);

  // ────────────────────────────────────────
  // Texture upload (inline per product row)
  // ────────────────────────────────────────
  async function handleTextureUpload(productId: string, file: File) {
    setUploadingTextureId(productId);
    try {
      console.log("[admin] Compressing texture...", file.name, file.size);
      const compressed = await compressImageFile(file);
      console.log("[admin] Compressed to", compressed.size, "bytes");

      const fd = new FormData();
      fd.append("file", new File([compressed], `${productId}-${Date.now()}.jpg`, { type: "image/jpeg" }));
      fd.append("productId", productId);

      const res = await fetchWithTimeout("/api/upload-texture", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        flash("Texturbild hochgeladen");
        fetchProducts();
      } else {
        console.error("[admin] Upload error:", data);
        flash(data.error || "Upload fehlgeschlagen", "err");
      }
    } catch (err: any) {
      console.error("[admin] Texture upload failed:", err);
      flash(
        err.message === "TIMEOUT"
          ? "Upload fehlgeschlagen — Timeout nach 30 Sekunden. Bitte erneut versuchen."
          : "Upload fehlgeschlagen. Bitte erneut versuchen.",
        "err"
      );
    }
    setUploadingTextureId(null);
  }

  // ────────────────────────────────────────
  // Product form submit (add / edit)
  // ────────────────────────────────────────
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const productId = editingId || `${form.category}-${slugify(form.name)}`;

    // STEP 1: Upload texture first (if provided) so we have the URL for the product save
    let newTextureUrl = "";
    if (textureFile) {
      try {
        console.log("[admin] Compressing texture...");
        const compressed = await compressImageFile(textureFile);
        console.log("[admin] Compressed:", compressed.size, "bytes");

        const fd = new FormData();
        fd.append("file", new File([compressed], `${productId}-${Date.now()}.jpg`, { type: "image/jpeg" }));
        fd.append("productId", productId);
        if (currentTextureUrl) fd.append("oldTextureUrl", currentTextureUrl);

        const uploadRes = await fetchWithTimeout("/api/upload-texture", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          newTextureUrl = uploadData.url;
          console.log("[admin] Texture uploaded:", newTextureUrl);
        } else {
          console.error("[admin] Image upload error:", uploadData);
          flash("Bild-Upload fehlgeschlagen: " + (uploadData.error || ""), "err");
        }
      } catch (err: any) {
        console.error("[admin] Image upload failed:", err);
        flash(
          "Bild-Upload fehlgeschlagen" +
            (err?.message === "TIMEOUT" ? " (Timeout)" : ""),
          "err"
        );
      }
    }

    // STEP 2: Save product data (with texture_url if we just uploaded one)
    try {
      if (editingId) {
        const body: Record<string, string> = {
          name: form.name,
          category: form.category,
          detail: form.detail,
          price: form.price,
          shop_url: form.shop_url,
          format: form.format,
          dimensions: form.dimensions,
          verlegemuster: form.verlegemuster,
          oberflaeche: form.oberflaeche,
        };
        if (newTextureUrl) body.texture_url = newTextureUrl;
        const res = await fetchWithTimeout(`/api/products/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { flash(data.error || "Fehler beim Speichern", "err"); setSubmitting(false); return; }
      } else {
        const product: FloorProduct = {
          id: productId,
          name: form.name,
          category: form.category,
          detail: form.detail,
          price: form.price,
          texture_url: newTextureUrl,
          shop_url: form.shop_url,
          format: form.format || undefined,
          dimensions: form.dimensions || undefined,
          verlegemuster: form.verlegemuster || undefined,
          oberflaeche: form.oberflaeche || undefined,
        };
        const res = await fetchWithTimeout("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });
        const data = await res.json();
        if (!res.ok) { flash(data.error || "Fehler beim Speichern", "err"); setSubmitting(false); return; }
      }
      flash(newTextureUrl ? "Produkt gespeichert + Bild aktualisiert" : (editingId ? "Produkt aktualisiert" : "Produkt hinzugefügt"));
    } catch (err: any) {
      console.error("[admin] Save failed:", err);
      flash(err?.message === "TIMEOUT" ? "Speichern — Timeout" : "Netzwerkfehler", "err");
      setSubmitting(false);
      return;
    }

    resetForm();
    fetchProducts();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Produkt wirklich löschen?")) return;
    try {
      const res = await fetchWithTimeout(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        flash("Produkt gelöscht");
        fetchProducts();
      } else {
        flash(data.error || "Fehler beim Löschen", "err");
      }
    } catch (err: any) {
      console.error("[admin] Delete error:", err);
      flash(err?.message === "TIMEOUT" ? "Löschen fehlgeschlagen — Timeout" : "Netzwerkfehler beim Löschen", "err");
    }
  }

  function handleEdit(product: FloorProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      detail: product.detail,
      price: product.price,
      shop_url: product.shop_url,
      format: product.format || "",
      dimensions: product.dimensions || "",
      verlegemuster: product.verlegemuster || "",
      oberflaeche: product.oberflaeche || "",
    });
    setTextureFile(null);
    setCurrentTextureUrl(product.texture_url || "");
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setTextureFile(null);
    setCurrentTextureUrl("");
    setEditingId(null);
  }

  // ────────────────────────────────────────
  // CSV Import
  // ────────────────────────────────────────
  function handleCsvFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setCsvFile(file);
    setCsvPreview([]);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSVClient(text);
      if (rows.length < 2) return;
      const header = rows[0].map((h) => h.toLowerCase().trim());
      const nameIdx = header.findIndex((h) => h === "name");
      const catIdx = header.findIndex((h) => h === "kategorie" || h === "category");
      const detailIdx = header.findIndex((h) => h === "detail");
      const priceIdx = header.findIndex((h) => h === "preis" || h === "price");
      const shopIdx = header.findIndex((h) => h.includes("shop") || h.includes("url"));

      const preview = rows.slice(1).map((row) => ({
        name: nameIdx !== -1 ? row[nameIdx] || "" : "",
        category: catIdx !== -1 ? row[catIdx] || "" : "",
        detail: detailIdx !== -1 ? row[detailIdx] || "" : "",
        price: priceIdx !== -1 ? row[priceIdx] || "" : "",
        shop_url: shopIdx !== -1 ? row[shopIdx] || "" : "",
      }));
      setCsvPreview(preview.filter((r) => r.name));
    };
    reader.readAsText(file);
  }

  async function handleCsvImport() {
    if (!csvFile) return;
    setCsvImporting(true);
    const fd = new FormData();
    fd.append("file", csvFile);
    const res = await fetch("/api/import-csv", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      flash(`${data.imported} Produkte importiert`);
      setCsvFile(null);
      setCsvPreview([]);
      fetchProducts();
    } else {
      flash(data.error || "Import fehlgeschlagen", "err");
    }
    setCsvImporting(false);
  }

  // ════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════
  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
        >
          <h1 className="mb-6 text-2xl font-bold text-gray-800">Admin-Bereich</h1>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Passwort
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Admin-Passwort eingeben"
          />
          {authError && <p className="mb-4 text-sm text-red-600">{authError}</p>}
          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Anmelden
          </button>
        </form>
      </main>
    );
  }

  // ════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Produktverwaltung</h1>
          <button
            onClick={() => {
              localStorage.removeItem("admin_auth");
              setAuthenticated(false);
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Abmelden
          </button>
        </div>

        {/* Flash message */}
        {message && (
          <div
            className={`mb-4 rounded px-4 py-2 text-sm ${
              message.type === "ok"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ── CSV Import ── */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">CSV-Import</h2>
          <p className="mb-3 text-sm text-gray-500">
            Erwartete Spalten (Semikolon oder Komma getrennt):{" "}
            <span className="font-mono text-gray-700">
              Name; Kategorie; Detail; Preis; Shop-URL
            </span>
          </p>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="text-sm text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {csvPreview.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-600">
                Vorschau: {csvPreview.length} Produkte erkannt
              </p>
              <div className="max-h-64 overflow-auto rounded border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Kategorie</th>
                      <th className="px-3 py-2">Detail</th>
                      <th className="px-3 py-2">Preis</th>
                      <th className="px-3 py-2">Shop-URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvPreview.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.category}</td>
                        <td className="px-3 py-2">{row.detail}</td>
                        <td className="px-3 py-2">{row.price}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{row.shop_url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleCsvImport}
                disabled={csvImporting}
                className="mt-3 rounded bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {csvImporting
                  ? "Importiere..."
                  : `${csvPreview.length} Produkte importieren`}
              </button>
            </div>
          )}
        </section>

        {/* ── Product Table ── */}
        <section className="mb-8 rounded-lg bg-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Alle Produkte ({filteredProducts.length})
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Filter:</label>
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value as Category | "alle")
                }
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="alle">Alle Kategorien</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-gray-500">Laden...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="p-6 text-gray-500">Keine Produkte vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Textur</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3">Preis</th>
                    <th className="px-4 py-3">Shop-URL</th>
                    <th className="px-4 py-3">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      {/* Texture thumbnail or warning */}
                      <td className="px-4 py-3">
                        {p.texture_url ? (
                          <img
                            src={p.texture_url}
                            alt={p.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded bg-amber-50 text-amber-500"
                            title="Kein Texturbild"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.detail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize">
                          {p.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{p.price}</td>
                      <td className="max-w-[150px] truncate px-4 py-3 text-xs text-gray-500">
                        {p.shop_url ? (
                          <a
                            href={p.shop_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Link
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {/* Texture upload button */}
                          <label
                            className={`cursor-pointer rounded px-2 py-1 text-xs font-medium ${
                              uploadingTextureId === p.id
                                ? "bg-gray-100 text-gray-400"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            {uploadingTextureId === p.id
                              ? "Lädt..."
                              : "Bild"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingTextureId === p.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleTextureUpload(p.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            onClick={() => handleEdit(p)}
                            className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Product Form (Add / Edit) ── */}
        <section ref={formRef} className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">
            {editingId ? "Produkt bearbeiten" : "Neues Produkt hinzufügen"}
          </h2>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="z.B. Eiche Rustikal"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Kategorie
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as Category })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Detail
                </label>
                <input
                  type="text"
                  required
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="z.B. Landhausdiele, gebürstet, geölt"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Preis
                </label>
                <input
                  type="text"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="z.B. ab 54,90 €/m²"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Shop-URL
                </label>
                <input
                  type="url"
                  required
                  value={form.shop_url}
                  onChange={(e) => setForm({ ...form, shop_url: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="https://www.parkettboerse.net/shop/..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Format</label>
                <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                  <option value="">— wählen —</option>
                  <option value="Planke">Planke</option>
                  <option value="Diele">Diele</option>
                  <option value="Fliese">Fliese</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Maße</label>
                <input type="text" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="z.B. 1220x185mm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Verlegemuster</label>
                <select value={form.verlegemuster} onChange={(e) => setForm({ ...form, verlegemuster: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                  <option value="">— wählen —</option>
                  <option value="Schiffsboden">Schiffsboden</option>
                  <option value="Fischgrät">Fischgrät</option>
                  <option value="versetzt">Versetzt</option>
                  <option value="gerade">Gerade</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Oberfläche</label>
                <input type="text" value={form.oberflaeche} onChange={(e) => setForm({ ...form, oberflaeche: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="z.B. gebürstet geölt" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Texturbild{editingId ? " (neues Bild ersetzt vorhandenes)" : ""}
                </label>
                {editingId && currentTextureUrl && !textureFile && (
                  <div className="mb-2 flex items-center gap-3">
                    <img src={currentTextureUrl} alt="Aktuelle Textur" className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                    <span className="text-xs text-gray-500">Aktuelles Bild</span>
                  </div>
                )}
                {textureFile && (
                  <div className="mb-2 flex items-center gap-3">
                    <img src={URL.createObjectURL(textureFile)} alt="Neues Bild" className="h-16 w-16 rounded-lg object-cover border border-blue-300" />
                    <span className="text-xs text-blue-600">Neues Bild ausgewählt</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setTextureFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-sm text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting
                  ? "Speichert..."
                  : editingId
                    ? "Änderungen speichern"
                    : "Produkt hinzufügen"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-gray-300 px-6 py-2 font-medium text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
