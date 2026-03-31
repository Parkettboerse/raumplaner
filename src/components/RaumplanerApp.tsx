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

  function handleImageUploaded(b: string) { setUploadedImage(b); setCurrentStep(2); }
  function handleReset() { setUploadedImage(null); setSelectedFloor(null); setResultImage(null); setError(null); setGenerating(false); setCurrentStep(1); }

  async function generatePreview(floor: FloorProduct) {
    if (!uploadedImage) return;
    setError(null); setResultImage(null); setGenerating(true); setCurrentStep(3);
    try {
      let textureImage: string | undefined;
      if (floor.texture_url) {
        try { const r = await fetch(floor.texture_url); if (r.ok) { const b = await r.blob(); textureImage = await new Promise<string>((res) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.readAsDataURL(b); }); } } catch {}
      }
      const res = await fetch("/api/generate-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomImage: uploadedImage, floorId: floor.id, textureImage }) });
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
    <div className="min-h-screen bg-white">
      {/* Step indicator — only from step 2 */}
      {currentStep > 1 && (
        <div className="flex justify-center border-b px-4 py-2.5" style={{ borderColor: "var(--grey-border)" }}>
          <StepIndicator currentStep={Math.min(currentStep, 3)} />
        </div>
      )}

      {/* Step 1: Full-width upload */}
      {currentStep === 1 && (
        <div className="px-4 py-8 sm:py-12">
          <div className="mb-6 flex justify-center"><StepIndicator currentStep={1} /></div>
          <ImageUpload onImageUploaded={handleImageUploaded} />
        </div>
      )}

      {/* Steps 2-4: Two-column layout */}
      {currentStep >= 2 && (
        <div className="flex flex-col lg:flex-row">
          {/* Left: Canvas */}
          <div className="flex-[65] border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--grey-border)" }}>
            <div className="p-4 sm:p-6 lg:p-8">

              {/* Step 2 */}
              {currentStep === 2 && uploadedImage && (
                <div className="animate-fadeIn">
                  <div className="relative w-full overflow-hidden rounded-lg">
                    <img src={uploadedImage} alt="Raumfoto" className="w-full object-contain" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent px-4 pb-3 pt-10">
                      <span className="text-sm text-white/80 hidden sm:block">Wählen Sie einen Bodenbelag</span>
                      <button onClick={handleReset} className="rounded-md bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm hover:bg-white/30">Anderes Foto</button>
                    </div>
                  </div>
                  <button onClick={() => sidebarRef.current?.scrollIntoView({ behavior: "smooth" })} className="mt-3 w-full rounded-lg py-3 text-center text-sm font-semibold text-white lg:hidden" style={{ backgroundColor: "var(--black)" }}>Böden anzeigen</button>
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && uploadedImage && (
                <div className="animate-fadeIn">
                  {error ? (
                    <div className="rounded-lg border p-6 text-center" style={{ borderColor: "var(--grey-border)" }}>
                      <p className="text-sm" style={{ color: "var(--black)" }}>{error}</p>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <button onClick={handleApplyFloor} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "var(--black)" }}>Nochmal</button>
                        <button onClick={handleTryAnother} className="rounded-lg border px-5 py-2.5 text-sm" style={{ borderColor: "var(--grey-border)", color: "var(--black)" }}>Anderer Boden</button>
                      </div>
                    </div>
                  ) : generating ? (
                    <div className="relative w-full overflow-hidden rounded-lg">
                      <img src={uploadedImage} alt="Generierung" className="w-full object-contain" style={{ filter: "blur(3px)", opacity: 0.35 }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-xl bg-white px-8 py-8 text-center shadow-sm sm:px-12">
                          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--grey-border)", borderTopColor: "var(--gold)" }} />
                          <p className="text-base font-semibold" style={{ color: "var(--black)" }}>Vorschau wird erstellt</p>
                          <p className="mt-1 text-xs" style={{ color: "var(--grey)" }}>{selectedFloor?.name}</p>
                          <p className="mt-3 text-[11px]" style={{ color: "var(--grey-light)" }}>10 – 30 Sekunden</p>
                        </div>
                      </div>
                    </div>
                  ) : resultImage ? (
                    <>
                      <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />
                      <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:gap-3">
                        <button onClick={() => setCurrentStep(4)} className="flex-1 rounded-lg py-3 text-sm font-semibold text-white" style={{ backgroundColor: "var(--black)" }}>Im Shop ansehen</button>
                        <button onClick={handleTryAnother} className="flex-1 rounded-lg border py-3 text-sm font-medium" style={{ borderColor: "var(--grey-border)", color: "var(--black)" }}>Anderer Boden</button>
                        <button onClick={handleDownload} className="flex-1 rounded-lg py-3 text-sm font-medium text-white" style={{ backgroundColor: "var(--green)" }}>
                          Bild speichern
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* Step 4 */}
              {currentStep === 4 && selectedFloor && (
                <div className="animate-fadeIn"><ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} /></div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div ref={sidebarRef} className="flex-[35] lg:max-h-[700px]">
            {currentStep === 2 && (
              <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor} onFloorSelect={setSelectedFloor} onApply={handleApplyFloor} />
            )}
            {currentStep === 3 && generating && (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--grey-border)", borderTopColor: "var(--gold)" }} />
                <p className="mt-3 text-sm" style={{ color: "var(--grey)" }}>{selectedFloor?.name}</p>
              </div>
            )}
            {currentStep === 3 && !generating && resultImage && (
              <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor}
                onFloorSelect={(f) => { setSelectedFloor(f); generatePreview(f); }} onApply={() => {}} />
            )}
            {currentStep === 4 && resultImage && (
              <div className="p-4 sm:p-5">
                <div className="overflow-hidden rounded-lg"><img src={resultImage} alt="Vorschau" className="w-full object-cover" /></div>
                <div className="mt-3 flex flex-col gap-2">
                  <button onClick={() => setCurrentStep(3)} className="rounded-lg border py-2 text-sm" style={{ borderColor: "var(--grey-border)", color: "var(--black)" }}>Zurück</button>
                  <button onClick={handleTryAnother} className="rounded-lg py-2 text-sm" style={{ color: "var(--gold)" }}>Anderer Boden</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}
