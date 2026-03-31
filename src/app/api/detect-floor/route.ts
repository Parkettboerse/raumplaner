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
    console.log("[detect-floor] Demo mode — using fallback polygon");
    return NextResponse.json({ points: FALLBACK, demo: true });
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
              text: `You are analyzing a room photo to find the floor. Look at where people would walk. The floor is the horizontal ground surface.

Return ONLY this exact JSON format, nothing else:
{"points":[{"x":number,"y":number}]}

where each point is a percentage (0-100) of image width (x) and height (y).
x=0 is left edge, x=100 is right edge. y=0 is top edge, y=100 is bottom edge.

Provide 4-8 points tracing the visible floor outline clockwise.
Be VERY precise - the floor starts where it meets the bottom of walls and the base of furniture.
Do not include any vertical surfaces.

Return ONLY the JSON object. No markdown, no backticks, no explanation.`,
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
      max_tokens: 400,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "";
    console.log("[detect-floor] GPT-4o response:", content);

    const jsonMatch = content.match(/\{[\s\S]*"points"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[detect-floor] Could not extract JSON");
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
      console.error("[detect-floor] Invalid points:", points);
      return NextResponse.json({ points: FALLBACK, fallback: true });
    }

    console.log("[detect-floor] Detected polygon:", JSON.stringify(points));
    return NextResponse.json({ points });
  } catch (err) {
    console.error("[detect-floor] Error:", err);
    return NextResponse.json({ points: FALLBACK, fallback: true });
  }
}
