"use client";

import { useState, useRef, useEffect } from "react";
import { FloorProduct } from "@/types";
import StepIndicator from "./StepIndicator";
import ImageUpload from "./ImageUpload";
import FloorCatalog from "./FloorCatalog";
import BeforeAfterSlider from "./BeforeAfterSlider";
import ProductDetail from "./ProductDetail";

export default function RaumplanerApp() {
  // Step 1: Upload, Step 2: Choose floor, Step 3: Result, Step 4: Product detail
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<FloorProduct | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<FloorProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setProducts(d); setProductsLoading(false); })
      .catch(() => setProductsLoading(false));
  }, []);

  function handleImageUploaded(base64: string) {
    setUploadedImage(base64);
    setCurrentStep(2);
  }

  function handleReset() {
    setUploadedImage(null); setSelectedFloor(null); setResultImage(null);
    setError(null); setGenerating(false); setCurrentStep(1);
  }

  async function generatePreview(floor: FloorProduct) {
    if (!uploadedImage) return;
    setError(null); setResultImage(null); setGenerating(true); setCurrentStep(3);

    try {
      let textureImage: string | undefined;
      if (floor.texture_url) {
        try {
          const r = await fetch(floor.texture_url);
          if (r.ok) {
            const blob = await r.blob();
            textureImage = await new Promise<string>((res) => {
              const rd = new FileReader();
              rd.onloadend = () => res(rd.result as string);
              rd.readAsDataURL(blob);
            });
          }
        } catch { /* texture fetch optional */ }
      }

      const res = await fetch("/api/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomImage: uploadedImage, floorId: floor.id, textureImage }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || "Fehler bei der Generierung"); setGenerating(false); return; }
      setResultImage(data.resultImage); setGenerating(false);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen."); setGenerating(false);
    }
  }

  function handleApplyFloor() {
    if (!selectedFloor) return;
    generatePreview(selectedFloor);
  }

  function handleTryAnother() {
    setSelectedFloor(null); setResultImage(null); setError(null);
    setGenerating(false); setCurrentStep(2);
  }

  function handleDownload() {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `raumvorschau-${selectedFloor?.name?.toLowerCase().replace(/\s+/g, "-") || "boden"}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--oak-bg)" }}>
      <header className="border-b bg-white" role="banner" style={{ borderColor: "var(--grey-lighter)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Parkettbörse Augsburg" className="h-[50px] w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="hidden sm:block h-8 w-px" style={{ backgroundColor: "var(--grey-lighter)" }} />
            <span className="hidden sm:block font-display text-xl font-semibold" style={{ color: "var(--dark)" }}>Raumplaner</span>
          </div>
          <nav className="flex items-center gap-4" aria-label="Hauptnavigation">
            <span className="hidden md:inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--oak-pale)", color: "var(--oak)" }}>KI-gestützte Vorschau</span>
            <a href="https://www.parkettboerse.net/shop" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:opacity-80" style={{ color: "var(--oak)" }}>Shop</a>
            <a href="https://www.parkettboerse.net/beratung" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:opacity-80" style={{ color: "var(--oak)" }}>Beratung</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl" style={{ color: "var(--dark)" }}>Ihr Raum</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--grey)" }}>Foto hochladen &amp; Boden testen</p>
          </div>
          <StepIndicator currentStep={Math.min(currentStep, 3)} />
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl" style={{ boxShadow: "0 4px 6px -1px rgba(139,105,20,0.08), 0 20px 40px -8px rgba(139,105,20,0.12)" }}>
          <div className="flex flex-col lg:flex-row">
            <div className="flex-[65] border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--grey-lighter)" }}>
              <div className="p-6 sm:p-8">

                {/* Step 1: Upload */}
                {currentStep === 1 && (
                  <div className="animate-fadeIn"><ImageUpload onImageUploaded={handleImageUploaded} /></div>
                )}

                {/* Step 2: Photo + choose floor */}
                {currentStep === 2 && uploadedImage && (
                  <div className="animate-fadeIn">
                    <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
                      <img src={uploadedImage} alt="Raumfoto" className="w-full object-contain" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-5 pb-5 pt-14">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--green)", color: "white" }}>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </span>
                            <span className="text-sm font-medium text-white">
                              <span className="hidden sm:inline">Foto hochgeladen — Wählen Sie rechts einen Bodenbelag →</span>
                              <span className="sm:hidden">Boden wählen →</span>
                            </span>
                          </div>
                          <button onClick={handleReset} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30">Anderes Foto</button>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => sidebarRef.current?.scrollIntoView({ behavior: "smooth" })} className="mt-4 w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white lg:hidden" style={{ backgroundColor: "var(--oak)" }}>Böden anzeigen ↓</button>
                  </div>
                )}

                {/* Step 3: Generating / Result */}
                {currentStep === 3 && uploadedImage && (
                  <div className="animate-fadeIn">
                    {error ? (
                      <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
                        <img src={uploadedImage} alt="Raumfoto" className="w-full object-contain opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="mx-4 max-w-sm rounded-2xl bg-white px-8 py-8 text-center shadow-xl">
                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-sm font-semibold" style={{ color: "var(--dark)" }}>{error}</p>
                            <div className="mt-4 flex flex-col gap-2">
                              <button onClick={handleApplyFloor} className="rounded-lg py-2 text-sm font-semibold text-white" style={{ backgroundColor: "var(--oak)" }}>Nochmal versuchen</button>
                              <button onClick={handleTryAnother} className="rounded-lg border py-2 text-sm font-semibold" style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}>Anderen Boden</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : generating ? (
                      <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
                        <img src={uploadedImage} alt="Wird generiert" className="w-full object-contain" style={{ filter: "blur(3px)", opacity: 0.5 }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="rounded-2xl bg-white px-10 py-8 text-center shadow-xl">
                            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--oak-pale)", borderTopColor: "var(--oak)" }} />
                            <p className="font-display text-base font-semibold" style={{ color: "var(--dark)" }}>KI generiert Vorschau...</p>
                            <p className="mt-1 text-xs" style={{ color: "var(--grey)" }}>{selectedFloor?.name}</p>
                            <p className="mt-3 text-xs" style={{ color: "var(--grey-light)" }}>Dies kann 10-30 Sekunden dauern</p>
                          </div>
                        </div>
                      </div>
                    ) : resultImage ? (
                      <>
                        <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                          <button onClick={() => setCurrentStep(4)} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--oak), var(--oak-light))", boxShadow: "0 4px 12px rgba(139,105,20,0.3)" }}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                            Im Shop ansehen
                          </button>
                          <button onClick={handleTryAnother} className="flex flex-1 items-center justify-center rounded-xl border py-3 text-sm font-semibold hover:bg-gray-50" style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}>Anderen Boden</button>
                          <button onClick={handleDownload} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--green)" }}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Speichern
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Step 4: Product detail */}
                {currentStep === 4 && selectedFloor && (
                  <div className="animate-fadeIn"><ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} /></div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div ref={sidebarRef} className="flex-[35] lg:max-h-[650px]">
              {currentStep === 1 && (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center opacity-60">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--oak-pale)" }}>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--grey-light)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="font-medium" style={{ color: "var(--dark)" }}>Bitte zuerst ein Foto hochladen</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--grey-light)" }}>Dann können Sie einen Boden auswählen</p>
                </div>
              )}
              {currentStep === 2 && (
                <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor} onFloorSelect={setSelectedFloor} onApply={handleApplyFloor} />
              )}
              {currentStep === 3 && generating && (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--oak-pale)", borderTopColor: "var(--oak)" }} />
                  <p className="mt-3 text-sm font-medium" style={{ color: "var(--dark)" }}>Generierung läuft...</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--grey-light)" }}>{selectedFloor?.name}</p>
                </div>
              )}
              {currentStep === 3 && !generating && resultImage && (
                <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor}
                  onFloorSelect={(f) => { setSelectedFloor(f); generatePreview(f); }}
                  onApply={() => {}}
                />
              )}
              {currentStep === 4 && resultImage && (
                <div className="flex h-full flex-col p-5 sm:p-6">
                  <h3 className="mb-3 font-display text-lg font-semibold" style={{ color: "var(--dark)" }}>Ihre Vorschau</h3>
                  <div className="overflow-hidden rounded-xl shadow-md"><img src={resultImage} alt="Vorschau" className="w-full object-cover" /></div>
                  <div className="mt-4 flex flex-col gap-2">
                    <button onClick={() => setCurrentStep(3)} className="rounded-lg border py-2 text-sm font-semibold hover:bg-gray-50" style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}>Zurück</button>
                    <button onClick={handleTryAnother} className="rounded-lg py-2 text-sm font-medium" style={{ color: "var(--oak)" }}>Anderen Boden</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out; }
      `}</style>
    </div>
  );
}
