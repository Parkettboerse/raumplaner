import sharp from "sharp";

interface Point {
  x: number;
  y: number;
}

/**
 * Create a PNG mask from polygon points.
 * Floor region (inside polygon) = transparent (alpha 0) → will be replaced
 * Everything else = black opaque (alpha 255) → stays original
 *
 * Points are percentages (0-100) of image dimensions.
 */
export async function createFloorMask(
  points: Point[],
  width: number,
  height: number
): Promise<Buffer> {
  // Convert percentage points to absolute pixel coordinates for SVG
  const absPoints = points.map((p) => ({
    x: Math.round((p.x / 100) * width),
    y: Math.round((p.y / 100) * height),
  }));

  const svgPoints = absPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // SVG: white background (keep) with black polygon (floor = replace)
  // After compositing, black area becomes transparent
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="white"/>
    <polygon points="${svgPoints}" fill="black"/>
  </svg>`;

  // Create the alpha mask: white = opaque, black = transparent
  const maskGrayscale = await sharp(Buffer.from(svg))
    .grayscale()
    .raw()
    .toBuffer();

  // Build RGBA where alpha follows the mask (white=255, black=0)
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const gray = maskGrayscale[i]; // 255 = keep, 0 = replace
    rgba[i * 4] = 0;       // R
    rgba[i * 4 + 1] = 0;   // G
    rgba[i * 4 + 2] = 0;   // B
    rgba[i * 4 + 3] = gray; // A: 255 = opaque (keep), 0 = transparent (replace)
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
