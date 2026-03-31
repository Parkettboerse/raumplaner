"use client";

import { useState, useRef } from "react";
import { FloorProduct } from "@/types";
import StepIndicator from "./StepIndicator";
import ImageUpload from "./ImageUpload";
import FloorCatalog from "./FloorCatalog";
import ProcessingOverlay from "./ProcessingOverlay";
import BeforeAfterSlider from "./BeforeAfterSlider";
import ProductDetail from "./ProductDetail";

interface FloorPoint {
  x: number;
  y: number;
}

export default function RaumplanerApp() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<FloorProduct | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoWarning, setDemoWarning] = useState<string | null>(null);
  const [floorRegion, setFloorRegion] = useState<FloorPoint[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);

  async function detectFloor(image: string) {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/detect-floor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomImage: image }),
      });
      const data = await res.json();
      if (data.floorRegion) {
        setFloorRegion(data.floorRegion);
      }
    } catch (err) {
      console.error("Floor detection failed:", err);
      // floorRegion stays null → generate-preview will use fallback
    }
    setAnalyzing(false);
  }

  function handleImageUploaded(base64: string) {
    setUploadedImage(base64);
    setCurrentStep(2);
    // Start floor detection in background
    detectFloor(base64);
  }

  function handleReset() {
    setUploadedImage(null);
    setSelectedFloor(null);
    setResultImage(null);
    setFloorRegion(null);
    setError(null);
    setDemoWarning(null);
    setAnalyzing(false);
    setCurrentStep(1);
  }

  function handleTryAnother() {
    setSelectedFloor(null);
    setResultImage(null);
    setError(null);
    setDemoWarning(null);
    setCurrentStep(2);
  }

  async function handleApplyFloor() {
    if (!selectedFloor || !uploadedImage) return;
    setError(null);
    setDemoWarning(null);
    setCurrentStep(3);

    try {
      const res = await fetch("/api/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImage: uploadedImage,
          floorId: selectedFloor.id,
          floorRegion: floorRegion || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ein unbekannter Fehler ist aufgetreten.");
        return;
      }

      if (data.demo) {
        setDemoWarning(data.warning);
      }
      if (data.beta) {
        setDemoWarning(data.warning);
      }

      setResultImage(data.resultImage);
      setCurrentStep(4);
    } catch {
      setError("Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.");
    }
  }

  function handleDownload() {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `raumvorschau-${selectedFloor?.name?.toLowerCase().replace(/\s+/g, "-") || "boden"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function scrollToSidebar() {
    sidebarRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--oak-bg)" }}>
      {/* ── Header ── */}
      <header className="border-b bg-white" role="banner" style={{ borderColor: "var(--grey-lighter)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Parkettbörse Augsburg — Logo"
              className="h-[50px] w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="hidden sm:block h-8 w-px" style={{ backgroundColor: "var(--grey-lighter)" }} />
            <span className="hidden sm:block font-display text-xl font-semibold" style={{ color: "var(--dark)" }}>
              Raumplaner
            </span>
          </div>
          <nav className="flex items-center gap-4" aria-label="Hauptnavigation">
            <span
              className="hidden md:inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: "var(--oak-pale)", color: "var(--oak)" }}
            >
              <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              KI-gestützte Vorschau
            </span>
            <a
              href="https://www.parkettboerse.net/shop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--oak)" }}
            >
              Shop
            </a>
            <a
              href="https://www.parkettboerse.net/beratung"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--oak)" }}
            >
              Beratung
            </a>
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Title + Steps */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl" style={{ color: "var(--dark)" }}>
              Ihr Raum
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--grey)" }}>
              Foto hochladen &amp; Boden testen
            </p>
          </div>
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* App Card */}
        <div
          className="overflow-hidden rounded-2xl bg-white shadow-xl"
          style={{
            boxShadow:
              "0 4px 6px -1px rgba(139, 105, 20, 0.08), 0 20px 40px -8px rgba(139, 105, 20, 0.12)",
          }}
        >
          <div className="flex flex-col lg:flex-row">
            {/* ════════ Left: Canvas (65%) ════════ */}
            <div
              className="flex-[65] border-b lg:border-b-0 lg:border-r"
              style={{ borderColor: "var(--grey-lighter)" }}
            >
              <div className="p-6 sm:p-8">
                {/* ── Step 1: Upload ── */}
                {currentStep === 1 && (
                  <div className="animate-fadeIn">
                    <ImageUpload onImageUploaded={handleImageUploaded} />
                  </div>
                )}

                {/* ── Step 2: Photo preview ── */}
                {currentStep === 2 && uploadedImage && (
                  <div className="animate-fadeIn">
                    <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
                      <img
                        src={uploadedImage}
                        alt="Hochgeladenes Raumfoto"
                        className="w-full object-contain"
                      />
                      {/* Bottom overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-5 pb-5 pt-14">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {analyzing ? (
                              <>
                                <div
                                  className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
                                  style={{ borderColor: "var(--oak-pale)", borderTopColor: "var(--white)" }}
                                />
                                <span className="text-sm font-medium text-white">
                                  Raum wird analysiert...
                                </span>
                              </>
                            ) : (
                              <>
                                <span
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                  style={{ backgroundColor: "var(--green)", color: "var(--white)" }}
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                                <span className="text-sm font-medium text-white">
                                  <span className="hidden sm:inline">
                                    Boden erkannt — Wählen Sie rechts einen Bodenbelag aus →
                                  </span>
                                  <span className="sm:hidden">Boden erkannt</span>
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={handleReset}
                            aria-label="Anderes Foto hochladen"
                            className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                          >
                            Anderes Foto
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Mobile: scroll-to-sidebar button */}
                    <button
                      onClick={scrollToSidebar}
                      aria-label="Zum Bodenkatalog scrollen"
                      className="mt-4 w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white lg:hidden"
                      style={{ backgroundColor: "var(--oak)" }}
                    >
                      Böden anzeigen ↓
                    </button>
                  </div>
                )}

                {/* ── Step 3: Processing ── */}
                {currentStep === 3 && uploadedImage && (
                  <div className="animate-fadeIn">
                    {error ? (
                      <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
                        <img
                          src={uploadedImage}
                          alt="Raumfoto"
                          className="w-full object-contain opacity-40"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                          <div
                            className="mx-4 max-w-sm rounded-2xl bg-white px-8 py-8 text-center"
                            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                          >
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                              <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold" style={{ color: "var(--dark)" }}>
                              {error}
                            </p>
                            <div className="mt-5 flex flex-col gap-2">
                              <button
                                onClick={handleApplyFloor}
                                className="rounded-lg py-2 text-sm font-semibold text-white"
                                style={{ backgroundColor: "var(--oak)" }}
                              >
                                Nochmal versuchen
                              </button>
                              <button
                                onClick={handleTryAnother}
                                className="rounded-lg border py-2 text-sm font-semibold"
                                style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}
                              >
                                Anderen Boden wählen
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
                        <img
                          src={uploadedImage}
                          alt="Raum wird verarbeitet"
                          className="w-full object-contain"
                          style={{ filter: "blur(3px)", opacity: 0.5 }}
                        />
                        <ProcessingOverlay floorName={selectedFloor?.name || "Boden"} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 4: Result ── */}
                {currentStep === 4 && uploadedImage && resultImage && (
                  <div className="animate-fadeIn">
                    {demoWarning && (
                      <div
                        className="mb-4 rounded-lg px-4 py-2.5 text-sm"
                        style={{ backgroundColor: "var(--oak-pale)", color: "var(--oak)" }}
                      >
                        {demoWarning}
                      </div>
                    )}

                    <BeforeAfterSlider
                      beforeImage={uploadedImage}
                      afterImage={resultImage}
                    />

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => setCurrentStep(5)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{
                          background: "linear-gradient(135deg, var(--oak) 0%, var(--oak-light) 100%)",
                          boxShadow: "0 4px 12px rgba(139, 105, 20, 0.3)",
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                        Diesen Boden im Shop ansehen
                      </button>
                      <button
                        onClick={handleTryAnother}
                        className="flex flex-1 items-center justify-center rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-gray-50"
                        style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}
                      >
                        Anderen Boden testen
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "var(--green)" }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Bild speichern
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 5: Product Detail ── */}
                {currentStep === 5 && selectedFloor && (
                  <div className="animate-fadeIn">
                    <ProductDetail
                      product={selectedFloor}
                      onBack={() => setCurrentStep(4)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ════════ Right: Sidebar (35%) ════════ */}
            <div ref={sidebarRef} className="flex-[35] lg:max-h-[650px]">
              {currentStep === 1 && (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center opacity-60">
                  <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--oak-pale)" }}
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--grey-light)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="font-medium" style={{ color: "var(--dark)" }}>
                    Bitte zuerst ein Foto hochladen
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--grey-light)" }}>
                    Dann können Sie einen Boden auswählen
                  </p>
                </div>
              )}

              {currentStep === 2 && (
                <FloorCatalog
                  selectedFloor={selectedFloor}
                  onFloorSelect={setSelectedFloor}
                  onApply={handleApplyFloor}
                />
              )}

              {currentStep === 3 && (
                <div className="pointer-events-none opacity-50">
                  <FloorCatalog
                    selectedFloor={selectedFloor}
                    onFloorSelect={() => {}}
                    onApply={() => {}}
                  />
                </div>
              )}

              {currentStep === 4 && (
                <FloorCatalog
                  selectedFloor={selectedFloor}
                  onFloorSelect={(floor) => {
                    setSelectedFloor(floor);
                    setResultImage(null);
                    setDemoWarning(null);
                    setCurrentStep(2);
                  }}
                  onApply={handleApplyFloor}
                />
              )}

              {currentStep === 5 && selectedFloor && resultImage && (
                <div className="flex h-full flex-col p-5 sm:p-6">
                  <h3
                    className="mb-3 font-display text-lg font-semibold"
                    style={{ color: "var(--dark)" }}
                  >
                    Ihre Vorschau
                  </h3>
                  <div className="overflow-hidden rounded-xl shadow-md">
                    <img
                      src={resultImage}
                      alt="Vorschau"
                      className="w-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="rounded-lg border py-2 text-center text-sm font-semibold transition-colors hover:bg-gray-50"
                      style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}
                    >
                      Zurück zur Vorschau
                    </button>
                    <button
                      onClick={handleTryAnother}
                      className="rounded-lg py-2 text-center text-sm font-medium"
                      style={{ color: "var(--oak)" }}
                    >
                      Anderen Boden testen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.35s ease-out;
        }
      `}</style>
    </div>
  );
}
