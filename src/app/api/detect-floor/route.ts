import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const maxDuration = 60;

interface FloorPoint {
  x: number;
  y: number;
}

function isDemoMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === "sk-dein-key-hier" || key.trim() === "";
}

export async function POST(request: NextRequest) {
  let body: { roomImage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  const { roomImage } = body;
  if (!roomImage) {
    return NextResponse.json(
      { error: "roomImage ist erforderlich" },
      { status: 400 }
    );
  }

  // Demo mode: return a default polygon (bottom half)
  if (isDemoMode()) {
    return NextResponse.json({
      floorRegion: [
        { x: 0, y: 55 },
        { x: 100, y: 55 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      demo: true,
    });
  }

  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this room photo. Identify the visible floor area precisely.

Return ONLY a JSON object (no markdown, no explanation) with this exact format:
{"floorRegion": [{"x": number, "y": number}, ...]}

The points are percentages (0-100) of image width (x) and height (y).
They form a polygon outlining ONLY the visible floor surface.
Trace the exact edges where floor meets walls, furniture legs, door frames, and objects.
Go clockwise. Use 6-12 points for accuracy.
Only include the floor - not walls, furniture tops, or other surfaces.`,
            },
            {
              type: "image_url",
              image_url: {
                url: roomImage,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "";

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*"floorRegion"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse floor region from:", content);
      return NextResponse.json({
        floorRegion: [
          { x: 0, y: 50 },
          { x: 100, y: 45 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        fallback: true,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const points: FloorPoint[] = parsed.floorRegion;

    // Validate points
    if (
      !Array.isArray(points) ||
      points.length < 3 ||
      !points.every(
        (p) =>
          typeof p.x === "number" &&
          typeof p.y === "number" &&
          p.x >= 0 && p.x <= 100 &&
          p.y >= 0 && p.y <= 100
      )
    ) {
      return NextResponse.json({
        floorRegion: [
          { x: 0, y: 50 },
          { x: 100, y: 45 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        fallback: true,
      });
    }

    return NextResponse.json({ floorRegion: points });
  } catch (err: any) {
    console.error("Floor detection error:", err);

    // Fallback: bottom half
    return NextResponse.json({
      floorRegion: [
        { x: 0, y: 50 },
        { x: 100, y: 45 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      fallback: true,
    });
  }
}
