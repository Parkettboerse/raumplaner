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
            <div style={{maxWidth:880,margin:'0 auto',padding:24,animation:'fadeUp .4s ease'}}>
              <StepIndicator currentStep={3} />
              <div style={{background:'white',borderRadius:24,padding:48,textAlign:'center',border:'1px solid #E5E5E5'}}>
                <p style={{fontSize:15,color:'#1A1A1A'}}>{error}</p>
                <div style={{marginTop:20,display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                  <button onClick={handleApplyFloor} style={{padding:'14px 24px',borderRadius:14,border:'none',background:'#0D0D0D',color:'white',fontSize:14,fontWeight:600,cursor:'pointer'}}>Nochmal versuchen</button>
                  <button onClick={handleTryAnother} style={{padding:'14px 24px',borderRadius:14,background:'white',color:'#1A1A1A',fontSize:14,fontWeight:600,cursor:'pointer',border:'1.5px solid #E5E5E5'}}>Anderen Boden</button>
                </div>
              </div>
            </div>
          ) : generating ? (
            <div style={{minHeight:520,display:'flex',alignItems:'center',justifyContent:'center',background:'#FAFAF8'}}>
              <div style={{background:'white',borderRadius:24,padding:'48px 52px',textAlign:'center',boxShadow:'0 24px 64px rgba(0,0,0,0.07)',animation:'fadeUp 0.4s ease'}}>
                <div style={{width:52,height:52,border:'3px solid #eee',borderTopColor:'#C8A415',borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 24px'}} />
                <h3 style={{fontSize:18,fontWeight:700,marginBottom:8}}>KI generiert Vorschau</h3>
                <p style={{fontSize:14,color:'#6B6B6B'}}>{selectedFloor?.name} wird in Ihren Raum eingesetzt</p>
                <div style={{marginTop:24,height:3,background:'#eee',borderRadius:2,maxWidth:200,marginLeft:'auto',marginRight:'auto',overflow:'hidden'}}>
                  <div style={{height:'100%',background:'#C8A415',borderRadius:2,animation:'loadProgress 15s ease-out forwards'}} />
                </div>
                <p style={{fontSize:12,color:'#bbb',marginTop:16}}>Dies kann 10–20 Sekunden dauern</p>
              </div>
            </div>
          ) : resultImage ? (
            <div style={{maxWidth:880,margin:'0 auto',padding:24,animation:'fadeUp .4s ease'}}>
              <StepIndicator currentStep={3} />

              <BeforeAfterSlider beforeImage={uploadedImage} afterImage={resultImage} />

              {selectedFloor && (
                <div style={{marginTop:20,padding:20,background:'white',border:'1px solid #E5E5E5',borderRadius:20,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
                  {selectedFloor.texture_url && (
                    <img src={selectedFloor.texture_url} alt="" style={{width:72,height:72,borderRadius:12,objectFit:'cover',flexShrink:0}} />
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <h3 style={{fontSize:17,fontWeight:700,color:'#1A1A1A'}}>{selectedFloor.name}</h3>
                    <p style={{fontSize:13,color:'#6B6B6B',marginTop:2}}>{selectedFloor.detail}</p>
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color:'#C8A415'}}>{selectedFloor.price}</div>
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:20}}>
                <button onClick={() => setCurrentStep(4)} style={{padding:'14px 16px',borderRadius:14,border:'none',background:'#C8A415',color:'#0D0D0D',fontSize:14,fontWeight:600,cursor:'pointer',transition:'all .25s'}}>Im Shop ansehen</button>
                <button onClick={handleTryAnother} style={{padding:'14px 16px',borderRadius:14,background:'white',color:'#1A1A1A',fontSize:14,fontWeight:600,cursor:'pointer',border:'1.5px solid #E5E5E5',transition:'all .25s'}}>Anderen Boden testen</button>
                <button onClick={handleDownload} style={{padding:'14px 16px',borderRadius:14,border:'none',background:'#0D0D0D',color:'white',fontSize:14,fontWeight:600,cursor:'pointer',transition:'all .25s'}}>Bild speichern</button>
              </div>
              <style>{`@media(max-width:768px){div[style*="grid-template-columns: 1fr 1fr 1fr"]{grid-template-columns:1fr !important;} div[style*="display: flex"][style*="gap: 20px"]{flex-direction:column;text-align:center;}}`}</style>
            </div>
          ) : null}
        </>
      )}

      {/* ═══ STEP 4: Product Detail ═══ */}
      {currentStep === 4 && selectedFloor && (
        <div style={{maxWidth:880,margin:'0 auto',padding:24,animation:'fadeUp .4s ease'}}>
          <ProductDetail product={selectedFloor} onBack={() => setCurrentStep(3)} />
        </div>
      )}
    </div>
  );
}
