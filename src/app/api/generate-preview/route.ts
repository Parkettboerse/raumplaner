import { NextResponse } from "next/server";

// Preview generation is now done client-side in FloorPreview.tsx
// This route is kept as a stub for backwards compatibility.
export async function POST() {
  return NextResponse.json(
    { error: "Vorschau wird jetzt client-seitig generiert. Bitte aktualisieren Sie die Seite." },
    { status: 410 }
  );
}
