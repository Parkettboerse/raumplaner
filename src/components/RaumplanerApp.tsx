"use client";

import { useState, useRef, useEffect } from "react";
import { FloorProduct } from "@/types";
import StepIndicator from "./StepIndicator";
import ImageUpload from "./ImageUpload";
import FloorCatalog from "./FloorCatalog";
import BeforeAfterSlider from "./BeforeAfterSlider";
import ProductDetail from "./ProductDetail";

export default function RaumplanerApp() {
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
    fetch("/api/products").then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setProducts(d); setProductsLoading(false); })
      .catch(() => setProductsLoading(false));
  }, []);

  function handleImageUploaded(b64: string) { setUploadedImage(b64); setCurrentStep(2); }

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
          if (r.ok) { const b = await r.blob(); textureImage = await new Promise<string>((res) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.readAsDataURL(b); }); }
        } catch { /* optional */ }
      }
      const res = await fetch("/api/generate-preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomImage: uploadedImage, floorId: floor.id, textureImage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Fehler bei der Generierung"); setGenerating(false); return; }
      setResultImage(data.resultImage); setGenerating(false);
    } catch { setError("Netzwerkfehler. Bitte erneut versuchen."); setGenerating(false); }
  }

  function handleApplyFloor() { if (selectedFloor) generatePreview(selectedFloor); }
  function handleTryAnother() { setSelectedFloor(null); setResultImage(null); setError(null); setGenerating(false); setCurrentStep(2); }

  function handleDownload() {
    if (!resultImage) return;
    const a = document.createElement("a"); a.href = resultImage;
    a.download = `raumvorschau-${selectedFloor?.name?.toLowerCase().replace(/\s+/g, "-") || "boden"}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--oak-bg)" }}>
      {/* Header */}
      <header className="bg-white" style={{ borderBottom: "1px solid var(--grey-lighter)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Parkettbörse Augsburg" className="h-[45px] w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-display text-lg font-semibold tracking-tight" style={{ color: "var(--dark)" }}>Raumplaner</span>
          </div>
          <div className="flex items-center gap-5">
            {currentStep > 1 && <StepIndicator currentStep={Math.min(currentStep, 3)} />}
            <div className="hidden h-5 w-px sm:block" style={{ backgroundColor: "var(--grey-lighter)" }} />
            <nav className="flex items-center gap-4">
              <a href="https://www.parkettboerse.net/shop" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium hover:opacity-70" style={{ color: "var(--grey)" }}>Shop</a>
              <a href="https://www.parkettboerse.net/beratung" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium hover:opacity-70" style={{ color: "var(--grey)" }}>Beratung</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col lg:flex-row">
            {/* Left */}
            <div className={`${currentStep === 1 ? "" : "flex-[65] border-b lg:border-b-0 lg:border-r"}`} style={{ borderColor: "var(--grey-lighter)" }}>
              <div className="p-7 sm:p-10">

                {currentStep === 1 && (
                  <div className="animate-fadeIn"><ImageUpload onImageUploaded={handleImageUploaded} /></div>
                )}

                {currentStep === 2 && uploadedImage && (
                  <div className="animate-fadeIn">
                    <div className="relative w-full overflow-hidden rounded-2xl">
                      <img src={uploadedImage} alt="Raumfoto" className="w-full object-contain" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-5 pb-4 pt-12">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-sm font-medium text-white/90">
                            <span className="hidden sm:inline">Wählen Sie rechts einen Bodenbelag</span>
                            <span className="sm:hidden">Boden wählen</span>
                          </span>
                          <button onClick={handleReset} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25">Anderes Foto</button>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => sidebarRef.current?.scrollIntoView({ behavior: "smooth" })} className="mt-4 w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white lg:hidden" style={{ backgroundColor: "var(--oak)" }}>Böden anzeigen</button>
                  </div>
                )}

                {currentStep === 3 && uploadedImage && (
                  <div className="animate-fadeIn">
                    {error ? (
                      <div className="relative w-full overflow-hidden rounded-2xl">
                        <img src={uploadedImage} alt="Raumfoto" className="w-full object-contain opacity-30" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="mx-4 max-w-sm rounded-2xl bg-white px-8 py-8 text-center shadow-lg">
                            <p className="text-sm" style={{ color: "var(--dark)" }}>{error}</p>
                            <div className="mt-5 flex flex-col gap-2">
                              <button onClick={handleApplyFloor} className="rounded-xl py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "var(--oak)" }}>Nochmal versuchen</button>
                              <button onClick={handleTryAnother} className="rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}>Anderen Boden</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : generating ? (
                      <div className="relative w-full overflow-hidden rounded-2xl">
                        <img src={uploadedImage} alt="Generierung" className="w-full object-contain" style={{ filter: "blur(4px)", opacity: 0.4 }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-2xl bg-white px-12 py-10 text-center shadow-lg">
                            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: "var(--grey-lighter)", borderTopColor: "var(--oak)" }} />
                            <p className="font-display text-lg font-semibold" style={{ color: "var(--dark)" }}>Vorschau wird erstellt</p>
                            <p className="mt-1.5 text-xs" style={{ color: "var(--grey)" }}>{selectedFloor?.name}</p>
                            <p className="mt-4 text-[11px]" style={{ color: "var(--grey-light)" }}>10 – 30 Sekunden</p>
                          </div>
                        </div>
                      </div>
                    ) : resultImage ? (
                      <>
                        <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                          <button onClick={() => setCurrentStep(4)} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--oak)" }}>
                            Im Shop ansehen
                          </button>
                          <button onClick={handleTryAnother} className="flex flex-1 items-center justify-center rounded-xl border py-3 text-sm font-medium hover:bg-gray-50" style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}>Anderen Boden</button>
                          <button onClick={handleDownload} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: "var(--green)" }}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Speichern
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {currentStep === 4 && selectedFloor && (
                  <div className="animate-fadeIn"><ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} /></div>
                )}
              </div>
            </div>

            {/* Sidebar — hidden in step 1 */}
            {currentStep > 1 && (
              <div ref={sidebarRef} className="flex-[35] lg:max-h-[650px]">
                {currentStep === 2 && (
                  <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor} onFloorSelect={setSelectedFloor} onApply={handleApplyFloor} />
                )}
                {currentStep === 3 && generating && (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: "var(--grey-lighter)", borderTopColor: "var(--oak)" }} />
                    <p className="mt-3 text-sm" style={{ color: "var(--grey)" }}>{selectedFloor?.name}</p>
                  </div>
                )}
                {currentStep === 3 && !generating && resultImage && (
                  <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor}
                    onFloorSelect={(f) => { setSelectedFloor(f); generatePreview(f); }} onApply={() => {}} />
                )}
                {currentStep === 4 && resultImage && (
                  <div className="flex h-full flex-col p-6">
                    <div className="overflow-hidden rounded-xl"><img src={resultImage} alt="Vorschau" className="w-full object-cover" /></div>
                    <div className="mt-4 flex flex-col gap-2">
                      <button onClick={() => setCurrentStep(3)} className="rounded-xl border py-2 text-sm font-medium hover:bg-gray-50" style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}>Zurück</button>
                      <button onClick={handleTryAnother} className="rounded-xl py-2 text-sm font-medium" style={{ color: "var(--oak)" }}>Anderen Boden</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
