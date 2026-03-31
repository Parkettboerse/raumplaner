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
    console.log("[detect-floor] Demo mode, using fallback polygon");
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
              text: `Look at this room photo from a normal standing perspective. Identify ONLY the floor surface - the horizontal ground that people walk on.

Do NOT include walls, furniture, objects, or vertical surfaces.

Return ONLY valid JSON: {"points": [{"x": number, "y": number}]}
where points are corners of the visible floor area as percentages (0-100) of image width and height.
x=0 is the left edge, x=100 is the right edge.
y=0 is the top edge, y=100 is the bottom edge.

Trace the floor edges precisely where floor meets walls and furniture bases.
Go clockwise starting from the top-left corner of the floor area.
Use 4-8 points for accuracy.

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
    console.log("[detect-floor] GPT response:", content);

    const jsonMatch = content.match(/\{[\s\S]*"points"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[detect-floor] Could not parse JSON from response");
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
          p.x >= 0 &&
          p.x <= 100 &&
          p.y >= 0 &&
          p.y <= 100
      )
    ) {
      console.error("[detect-floor] Invalid points:", points);
      return NextResponse.json({ points: FALLBACK, fallback: true });
    }

    console.log("[detect-floor] Detected floor polygon:", JSON.stringify(points));
    return NextResponse.json({ points });
  } catch (err) {
    console.error("[detect-floor] Error:", err);
    return NextResponse.json({ points: FALLBACK, fallback: true });
  }
}
