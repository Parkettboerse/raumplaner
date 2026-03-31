import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const maxDuration = 30;

interface FloorPoint {
  x: number;
  y: number;
}

const FALLBACK: FloorPoint[] = [
  { x: 0, y: 55 },
  { x: 100, y: 55 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

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

  if (isDemoMode()) {
    return NextResponse.json({ points: FALLBACK, demo: true });
  }

  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this room photo. Identify the visible floor area.
Return ONLY a JSON object: {"points": [{"x": number, "y": number}]}
where each point is a corner of the floor area as percentage (0-100) of image width (x) and height (y).
Start top-left and go clockwise. Include 4-6 points that precisely outline the floor polygon.
Trace along walls, furniture edges, and door frames.
Return ONLY valid JSON, no markdown, no explanation.`,
            },
            {
              type: "image_url",
              image_url: {
                url: roomImage,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*"points"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse floor points from:", content);
      return NextResponse.json({ points: FALLBACK, fallback: true });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const points: FloorPoint[] = parsed.points;

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
      return NextResponse.json({ points: FALLBACK, fallback: true });
    }

    return NextResponse.json({ points });
  } catch (err) {
    console.error("Floor detection error:", err);
    return NextResponse.json({ points: FALLBACK, fallback: true });
  }
}
