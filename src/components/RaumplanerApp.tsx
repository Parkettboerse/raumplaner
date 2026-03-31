"use client";

import { useState, useRef, useEffect } from "react";
import { FloorProduct } from "@/types";
import StepIndicator from "./StepIndicator";
import ImageUpload from "./ImageUpload";
import FloorCatalog from "./FloorCatalog";
import BeforeAfterSlider from "./BeforeAfterSlider";
import ProductDetail from "./ProductDetail";

const S = {
  page: { minHeight: "100vh", background: "#0D0D0D", fontFamily: "'Outfit', sans-serif", color: "#fff" } as const,
  darkBar: { background: "#0D0D0D", padding: "20px 24px 16px", display: "flex", justifyContent: "center" } as const,
  content: { background: "#FAFAF8", borderRadius: "24px 24px 0 0", minHeight: "60vh", padding: "24px" } as const,
  contentFlush: { background: "#FAFAF8", borderRadius: "24px 24px 0 0", minHeight: "60vh" } as const,
  loadWrap: { minHeight: 520, display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D0D" } as const,
  loadBox: { background: "#161616", borderRadius: 24, padding: "48px 52px", textAlign: "center" as const, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", animation: "fadeUp .4s ease", border: "1px solid #222" },
  spinner: { width: 52, height: 52, border: "3px solid #333", borderTopColor: "#C8A415", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 24px" },
  loadBar: { marginTop: 24, height: 3, background: "#333", borderRadius: 2, overflow: "hidden" as const, maxWidth: 200, marginLeft: "auto", marginRight: "auto" },
  loadFill: { height: "100%", background: "#C8A415", borderRadius: 2, animation: "loadProgress 15s ease-out forwards" },
  prodCard: { marginTop: 20, padding: 20, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" as const },
  btnGold: { padding: "14px 16px", borderRadius: 14, border: "none", background: "#C8A415", color: "#0D0D0D", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .25s" },
  btnOutline: { padding: "14px 16px", borderRadius: 14, background: "transparent", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", border: "1.5px solid #333", transition: "all .25s" },
  btnBlack: { padding: "14px 16px", borderRadius: 14, border: "none", background: "#fff", color: "#0D0D0D", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .25s" },
};

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
    <div style={S.page}>

      {/* ═══ STEP 1: Landing ═══ */}
      {currentStep === 1 && <ImageUpload onImageUploaded={handleImageUploaded} />}

      {/* ═══ STEP 2: Boden wählen ═══ */}
      {currentStep === 2 && uploadedImage && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={S.darkBar}><StepIndicator currentStep={2} /></div>
          <div style={S.contentFlush}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
              <div className="main-grid">
                <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", position: "relative" }}>
                  <img src={uploadedImage} alt="Ihr Raum" style={{ width: "100%", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "28px 24px 20px", background: "linear-gradient(transparent, rgba(10,10,10,0.65))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "white" }}>Wählen Sie einen Bodenbelag</span>
                    <button onClick={handleReset} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 16px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)" }}>Anderes Foto</button>
                  </div>
                </div>
                <div ref={sidebarRef}>
                  <FloorCatalog products={products} loading={productsLoading} selectedFloor={selectedFloor} onFloorSelect={setSelectedFloor} onApply={handleApplyFloor} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Loading / Error / Result ═══ */}
      {currentStep === 3 && uploadedImage && (
        <>
          {error ? (
            <div style={{ animation: "fadeUp .4s ease" }}>
              <div style={S.darkBar}><StepIndicator currentStep={3} /></div>
              <div style={S.content}>
                <div style={{ maxWidth: 600, margin: "40px auto", background: "#161616", borderRadius: 24, padding: 48, textAlign: "center", border: "1px solid #2a2a2a" }}>
                  <p style={{ fontSize: 15, color: "#ccc" }}>{error}</p>
                  <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={handleApplyFloor} style={S.btnGold}>Nochmal versuchen</button>
                    <button onClick={handleTryAnother} style={S.btnOutline}>Anderen Boden</button>
                  </div>
                </div>
              </div>
            </div>
          ) : generating ? (
            <div style={S.loadWrap}>
              <div style={S.loadBox}>
                <div style={S.spinner} />
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#fff" }}>KI generiert Vorschau</h3>
                <p style={{ fontSize: 14, color: "#888" }}>{selectedFloor?.name} wird in Ihren Raum eingesetzt</p>
                <div style={S.loadBar}><div style={S.loadFill} /></div>
                <p style={{ fontSize: 12, color: "#555", marginTop: 16 }}>Dies kann 10–20 Sekunden dauern</p>
              </div>
            </div>
          ) : resultImage ? (
            <div style={{ animation: "fadeUp .4s ease" }}>
              <div style={S.darkBar}><StepIndicator currentStep={3} /></div>
              <div style={{ ...S.content, background: "#111" }}>
                <div style={{ maxWidth: 880, margin: "0 auto" }}>
                  <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />

                  {selectedFloor && (
                    <div style={S.prodCard}>
                      {selectedFloor.texture_url && (
                        <img src={selectedFloor.texture_url} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{selectedFloor.name}</h3>
                        <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{selectedFloor.detail}</p>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#C8A415" }}>{selectedFloor.price}</div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20 }}>
                    <button onClick={() => setCurrentStep(4)} style={S.btnGold}>Im Shop ansehen</button>
                    <button onClick={handleTryAnother} style={S.btnOutline}>Anderen Boden testen</button>
                    <button onClick={handleDownload} style={S.btnBlack}>Bild speichern</button>
                  </div>
                </div>
              </div>
              <style>{`@media(max-width:768px){div[style*="grid-template-columns: 1fr 1fr 1fr"]{grid-template-columns:1fr !important;}}`}</style>
            </div>
          ) : null}
        </>
      )}

      {/* ═══ STEP 4: Product Detail ═══ */}
      {currentStep === 4 && selectedFloor && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={S.darkBar}><StepIndicator currentStep={3} /></div>
          <div style={S.content}>
            <div style={{ maxWidth: 880, margin: "0 auto" }}>
              <ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
