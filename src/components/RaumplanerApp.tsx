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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const res = await fetch("/api/generate-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomImage: uploadedImage, floorId: floor.id, textureImage }), signal: controller.signal });
      clearTimeout(timeout);
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

      {/* ═══ STEP 1: Landing ═══ */}
      {currentStep === 1 && <ImageUpload onImageUploaded={handleImageUploaded} />}

      {/* ═══ STEP 2: Boden wählen ═══ */}
      {currentStep === 2 && uploadedImage && (
        <div className="animate-fadeUp" style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
          <div className="mb-6 flex justify-center"><StepIndicator currentStep={2} /></div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 380px" }}>
            {/* Image */}
            <div className="relative overflow-hidden" style={{ borderRadius: "var(--radius)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
              <img src={uploadedImage} alt="Raumfoto" className="w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.65), transparent)", padding: "28px 24px 20px" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-white/90">Wählen Sie einen Bodenbelag</span>
                  <button onClick={handleReset} className="rounded-full bg-white/15 px-4 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm transition hover:bg-white/25">Anderes Foto</button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div ref={sidebarRef}>
              <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor} onFloorSelect={setSelectedFloor} onApply={handleApplyFloor} />
            </div>
          </div>

          {/* Mobile: scroll to sidebar */}
          <button onClick={() => sidebarRef.current?.scrollIntoView({ behavior: "smooth" })} className="mt-4 w-full rounded-[14px] py-3.5 text-center text-[14px] font-semibold text-white lg:hidden" style={{ backgroundColor: "var(--black)" }}>Böden anzeigen</button>

          {/* Mobile: single column override */}
          <style>{`@media(max-width:768px){.grid{grid-template-columns:1fr !important;}}`}</style>
        </div>
      )}

      {/* ═══ STEP 3: Loading / Result ═══ */}
      {currentStep === 3 && uploadedImage && (
        <>
          {error ? (
            <div className="animate-fadeUp" style={{ maxWidth: "880px", margin: "0 auto", padding: "24px" }}>
              <div className="mb-6 flex justify-center"><StepIndicator currentStep={3} /></div>
              <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--grey-border)" }}>
                <p className="text-[15px]" style={{ color: "var(--dark)" }}>{error}</p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button onClick={handleApplyFloor} className="rounded-[14px] px-6 py-3.5 text-[14px] font-semibold text-white" style={{ backgroundColor: "var(--black)" }}>Nochmal versuchen</button>
                  <button onClick={handleTryAnother} className="rounded-[14px] border px-6 py-3.5 text-[14px] font-medium" style={{ borderColor: "var(--grey-border)", color: "var(--dark)" }}>Anderen Boden</button>
                </div>
              </div>
            </div>
          ) : generating ? (
            /* Loading */
            <div className="flex items-center justify-center" style={{ minHeight: "520px", background: "var(--bg)" }}>
              <div className="animate-fadeUp rounded-3xl bg-white text-center" style={{ padding: "48px 52px", boxShadow: "0 24px 64px rgba(0,0,0,0.07)" }}>
                <div className="mx-auto mb-5 rounded-full" style={{ width: "52px", height: "52px", border: "3px solid #eee", borderTopColor: "var(--gold)", animation: "spin 0.7s linear infinite" }} />
                <p className="text-[18px] font-bold" style={{ color: "var(--dark)" }}>KI generiert Vorschau</p>
                <p className="mt-2 text-[14px]" style={{ color: "var(--grey)" }}>{selectedFloor?.name} wird in Ihren Raum eingesetzt</p>
                <div className="mx-auto mt-6 overflow-hidden rounded-full" style={{ height: "3px", maxWidth: "200px", background: "#eee" }}>
                  <div className="h-full rounded-full" style={{ background: "var(--gold)", animation: "loadProgress 15s ease-out forwards" }} />
                </div>
                <p className="mt-4 text-[12px]" style={{ color: "#bbb" }}>Dies kann 10–20 Sekunden dauern</p>
              </div>
            </div>
          ) : resultImage ? (
            /* Result */
            <div className="animate-fadeUp" style={{ maxWidth: "880px", margin: "0 auto", padding: "24px" }}>
              <div className="mb-6 flex justify-center"><StepIndicator currentStep={3} /></div>

              <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />

              {/* Product info card */}
              {selectedFloor && (
                <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row" style={{ background: "var(--white)", border: "1px solid var(--grey-border)", borderRadius: "var(--radius)", padding: "20px" }}>
                  {selectedFloor.texture_url && (
                    <img src={selectedFloor.texture_url} alt="" className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-[17px] font-bold" style={{ color: "var(--dark)" }}>{selectedFloor.name}</p>
                    <p className="mt-0.5 text-[13px]" style={{ color: "var(--grey)" }}>{selectedFloor.detail}</p>
                  </div>
                  <p className="text-[22px] font-extrabold" style={{ color: "var(--gold)" }}>{selectedFloor.price}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-4 grid grid-cols-1 gap-[10px] sm:grid-cols-3">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="relative overflow-hidden rounded-[14px] py-3.5 text-[14px] font-semibold transition-all duration-250 hover:-translate-y-0.5"
                  style={{ backgroundColor: "var(--gold)", color: "var(--black)" }}
                  onMouseEnter={(e)=>{e.currentTarget.style.boxShadow="0 8px 24px var(--gold-glow)";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.boxShadow="none";}}
                >
                  <span className="relative z-10">Im Shop ansehen</span>
                  <div className="absolute inset-0 z-0" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",animation:"shine 2.5s infinite"}} />
                </button>
                <button onClick={handleTryAnother} className="rounded-[14px] py-3.5 text-[14px] font-semibold transition-all duration-250 hover:-translate-y-0.5" style={{ background: "var(--white)", border: "1.5px solid var(--grey-border)", color: "var(--dark)" }}>
                  Anderen Boden testen
                </button>
                <button onClick={handleDownload} className="rounded-[14px] py-3.5 text-[14px] font-semibold text-white transition-all duration-250 hover:-translate-y-0.5" style={{ backgroundColor: "var(--black)" }}>
                  Bild speichern
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ═══ STEP 4: Product Detail ═══ */}
      {currentStep === 4 && selectedFloor && (
        <div className="animate-fadeUp" style={{ maxWidth: "880px", margin: "0 auto", padding: "24px" }}>
          <ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} />
        </div>
      )}
    </div>
  );
}
