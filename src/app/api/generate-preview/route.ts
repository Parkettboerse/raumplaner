import { NextResponse } from "next/server";

// Preview is now rendered client-side via Canvas in FloorPreview.tsx.
// This route is kept as a stub.
export async function POST() {
  return NextResponse.json(
    { error: "Vorschau wird client-seitig generiert." },
    { status: 410 }
  );
}
