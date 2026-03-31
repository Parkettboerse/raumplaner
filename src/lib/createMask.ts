import sharp from "sharp";

interface Point {
  x: number;
  y: number;
}

/**
 * Create a PNG mask from polygon points for OpenAI Edit API.
 * Floor region (inside polygon) = transparent (alpha 0) → will be replaced by AI
 * Everything else = black opaque (alpha 255) → stays original
 */
export async function createFloorMask(
  points: Point[],
  width: number,
  height: number
): Promise<Buffer> {
  const svgPoints = points
    .map((p) => `${Math.round((p.x / 100) * width)},${Math.round((p.y / 100) * height)}`)
    .join(" ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="white"/>
    <polygon points="${svgPoints}" fill="black"/>
  </svg>`;

  const maskGrayscale = await sharp(Buffer.from(svg))
    .grayscale()
    .raw()
    .toBuffer();

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const gray = maskGrayscale[i];
    rgba[i * 4] = 0;
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = gray; // 255 = opaque (keep), 0 = transparent (replace)
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Create a grayscale mask PNG for compositing.
 * Floor region = white (255), everything else = black (0).
 */
export async function createCompositeMask(
  points: Point[],
  width: number,
  height: number
): Promise<Buffer> {
  const svgPoints = points
    .map((p) => `${Math.round((p.x / 100) * width)},${Math.round((p.y / 100) * height)}`)
    .join(" ");

  // Floor polygon is white, rest is black
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="black"/>
    <polygon points="${svgPoints}" fill="white"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .grayscale()
    .png()
    .toBuffer();
}
