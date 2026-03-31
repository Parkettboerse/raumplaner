import sharp from "sharp";

interface Point {
  x: number;
  y: number;
}

/**
 * Create a grayscale mask PNG from polygon points.
 * Floor region (inside polygon) = white (255)
 * Everything else = black (0)
 */
export async function createFloorMask(
  points: Point[],
  width: number,
  height: number
): Promise<Buffer> {
  const svgPoints = points
    .map(
      (p) =>
        `${Math.round((p.x / 100) * width)},${Math.round((p.y / 100) * height)}`
    )
    .join(" ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="black"/>
    <polygon points="${svgPoints}" fill="white"/>
  </svg>`;

  return sharp(Buffer.from(svg)).grayscale().png().toBuffer();
}
