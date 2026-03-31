import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const maxDuration = 30;

interface Corner {
  x: number;
  y: number;
}

const FALLBACK: Corner[] = [
  { x: 10, y: 50 },
  { x: 90, y: 50 },
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
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });
  }

  const { roomImage } = body;
  if (!roomImage) {
    return NextResponse.json({ error: "roomImage ist erforderlich" }, { status: 400 });
  }

  if (isDemoMode()) {
    console.log("[detect-floor] Demo mode — using fallback");
    return NextResponse.json({ corners: FALLBACK, demo: true });
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
              text: `Look at this interior room photo. I need you to identify ONLY the floor - the flat horizontal ground surface that people walk on. Ignore walls, furniture, ceiling, and all objects.

Return ONLY raw JSON (no markdown, no backticks, no explanation):
{"corners":[{"x":number,"y":number},{"x":number,"y":number},{"x":number,"y":number},{"x":number,"y":number}]}

The 4 corners define the visible floor quadrilateral as PERCENTAGES (0-100) of image width (x) and height (y).
x=0 is left edge, x=100 is right edge. y=0 is top edge, y=100 is bottom edge.

Order: top-left of floor, top-right of floor, bottom-right of floor, bottom-left of floor.
The top corners are where the floor meets the back wall.
The bottom corners are the closest floor edges to the camera.`,
            },
            {
              type: "image_url",
              image_url: { url: roomImage, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "";
    console.log("[detect-floor] GPT-4o raw:", content);

    const jsonMatch = content.match(/\{[\s\S]*"corners"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[detect-floor] No JSON found");
      return NextResponse.json({ corners: FALLBACK, fallback: true });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const corners: Corner[] = parsed.corners;

    if (
      !Array.isArray(corners) ||
      corners.length !== 4 ||
      !corners.every(
        (c) =>
          typeof c.x === "number" &&
          typeof c.y === "number" &&
          c.x >= 0 && c.x <= 100 &&
          c.y >= 0 && c.y <= 100
      )
    ) {
      console.error("[detect-floor] Invalid corners:", corners);
      return NextResponse.json({ corners: FALLBACK, fallback: true });
    }

    console.log("[detect-floor] Corners:", JSON.stringify(corners));
    return NextResponse.json({ corners });
  } catch (err) {
    console.error("[detect-floor] Error:", err);
    return NextResponse.json({ corners: FALLBACK, fallback: true });
  }
}
