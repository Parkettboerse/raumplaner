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

  function handleDownload() {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = "parkettboerse-raumplaner.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Steps 2 and 3 share the same two-column layout
  const showGrid = (currentStep === 2 || currentStep === 3) && uploadedImage;

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0D", fontFamily: "'Outfit', sans-serif" }}>

      {/* ═══ STEP 1 ═══ */}
      {currentStep === 1 && <ImageUpload onImageUploaded={handleImageUploaded} />}

      {/* ═══ STEPS 2 & 3: Same grid layout ═══ */}
      {showGrid && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "center" }}>
            <StepIndicator currentStep={currentStep} />
          </div>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>

              {/* LEFT: Image / Slider / Spinner */}
              <div>
                {generating ? (
                  /* Loading spinner in place of image */
                  <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #2a2a2a", background: "#1A1A1A", minHeight: 350, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <div style={{ width: 52, height: 52, border: "3px solid #333", borderTopColor: "#C8A415", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: 24 }} />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>KI generiert Vorschau</h3>
                    <p style={{ fontSize: 14, color: "#888" }}>{selectedFloor?.name}</p>
                    <div style={{ marginTop: 20, height: 3, background: "#333", borderRadius: 2, width: 180, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#C8A415", borderRadius: 2, animation: "loadProgress 15s ease-out forwards" }} />
                    </div>
                    <p style={{ fontSize: 12, color: "#555", marginTop: 12 }}>10–20 Sekunden</p>
                  </div>
                ) : error ? (
                  /* Error in place of image */
                  <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #2a2a2a", background: "#1A1A1A", minHeight: 250, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 40 }}>
                    <p style={{ fontSize: 15, color: "#ccc", textAlign: "center" }}>{error}</p>
                    <button onClick={handleApplyFloor} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 14, border: "none", background: "#C8A415", color: "#0D0D0D", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Nochmal versuchen</button>
                  </div>
                ) : resultImage ? (
                  /* Before/After slider + actions below */
                  <div>
                    <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />

                    {selectedFloor && (
                      <div style={{ marginTop: 16, padding: 16, background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        {selectedFloor.texture_url && (
                          <img src={selectedFloor.texture_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{selectedFloor.name}</div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{selectedFloor.detail}</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#C8A415" }}>{selectedFloor.price}</div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                      <button onClick={() => setCurrentStep(4)} style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: "#C8A415", color: "#0D0D0D", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Im Shop ansehen</button>
                      <button onClick={handleDownload} style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: "#fff", color: "#0D0D0D", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Bild speichern</button>
                    </div>
                  </div>
                ) : (
                  /* Original uploaded photo */
                  <div style={{ borderRadius: 20, overflow: "hidden", position: "relative", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: "1px solid #2a2a2a" }}>
                    <img src={uploadedImage} alt="Ihr Raum" style={{ width: "100%", display: "block" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "28px 24px 20px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "white" }}>Wählen Sie einen Bodenbelag</span>
                      <button onClick={handleReset} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid #444", color: "#ccc", padding: "6px 16px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Anderes Foto</button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Sidebar — always visible */}
              <div ref={sidebarRef}>
                <FloorCatalog
                  products={products}
                  loading={productsLoading}
                  selectedFloor={selectedFloor}
                  onFloorSelect={setSelectedFloor}
                  onApply={handleApplyFloor}
                />
              </div>
            </div>
          </div>
          <style>{`@media(max-width:768px){div[style*="grid-template-columns: 1fr 380px"]{grid-template-columns:1fr !important;}}`}</style>
        </div>
      )}

      {/* ═══ STEP 4: Product Detail ═══ */}
      {currentStep === 4 && selectedFloor && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "center" }}><StepIndicator currentStep={3} /></div>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 24px" }}>
            <ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} />
          </div>
        </div>
      )}
    </div>
  );
}
