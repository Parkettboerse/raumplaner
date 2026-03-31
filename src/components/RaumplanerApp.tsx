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
    <div style={{ minHeight: "100vh", background: "var(--white)" }}>

      {/* ═══ STEP 1: Landing ═══ */}
      {currentStep === 1 && <ImageUpload onImageUploaded={handleImageUploaded} />}

      {/* ═══ STEP 2: Boden wählen ═══ */}
      {currentStep === 2 && uploadedImage && (
        <div className="step2">
          <StepIndicator currentStep={2} />

          <div className="main-grid">
            <div className="canvas-wrap">
              <img src={uploadedImage} alt="Ihr Raum" />
              <div className="canvas-info">
                <h3>Wählen Sie einen Bodenbelag</h3>
                <button onClick={handleReset} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)" }}>
                  Anderes Foto
                </button>
              </div>
            </div>

            <div ref={sidebarRef}>
              <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor} onFloorSelect={setSelectedFloor} onApply={handleApplyFloor} />
            </div>
          </div>

          {/* Mobile: scroll to sidebar */}
          <button onClick={() => sidebarRef.current?.scrollIntoView({ behavior: "smooth" })} className="go-btn" style={{ marginTop: "16px", display: "none" }}>
            Böden anzeigen
          </button>
          <style>{`@media(max-width:768px){.step2 .go-btn[style]{display:block !important;}}`}</style>
        </div>
      )}

      {/* ═══ STEP 3: Loading / Error / Result ═══ */}
      {currentStep === 3 && uploadedImage && (
        <>
          {error ? (
            <div className="result-wrap">
              <StepIndicator currentStep={3} />
              <div style={{ background: "white", borderRadius: "24px", padding: "48px", textAlign: "center", border: "1px solid var(--grey-border)" }}>
                <p style={{ fontSize: "15px", color: "var(--dark)" }}>{error}</p>
                <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="rb rb-black" onClick={handleApplyFloor}>Nochmal versuchen</button>
                  <button className="rb rb-outline" onClick={handleTryAnother}>Anderen Boden</button>
                </div>
              </div>
            </div>
          ) : generating ? (
            <div className="load-wrap">
              <div className="load-box">
                <div className="load-spin" />
                <h3>KI generiert Vorschau</h3>
                <p>{selectedFloor?.name} wird in Ihren Raum eingesetzt</p>
                <div className="load-bar"><div className="load-bar-fill" /></div>
                <div className="load-time">Dies kann 10–20 Sekunden dauern</div>
              </div>
            </div>
          ) : resultImage ? (
            <div className="result-wrap">
              <StepIndicator currentStep={3} />

              <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />

              {selectedFloor && (
                <div className="prod-result">
                  {selectedFloor.texture_url && (
                    <div className="prod-result-tex"><img src={selectedFloor.texture_url} alt="" /></div>
                  )}
                  <div className="prod-result-info">
                    <h3>{selectedFloor.name}</h3>
                    <p>{selectedFloor.detail}</p>
                  </div>
                  <div className="prod-result-price">{selectedFloor.price}</div>
                </div>
              )}

              <div className="res-btns">
                <button className="rb rb-gold" onClick={() => setCurrentStep(4)}>Im Shop ansehen</button>
                <button className="rb rb-outline" onClick={handleTryAnother}>Anderen Boden testen</button>
                <button className="rb rb-black" onClick={handleDownload}>Bild speichern</button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ═══ STEP 4: Product Detail ═══ */}
      {currentStep === 4 && selectedFloor && (
        <div className="result-wrap">
          <ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} />
        </div>
      )}
    </div>
  );
}
