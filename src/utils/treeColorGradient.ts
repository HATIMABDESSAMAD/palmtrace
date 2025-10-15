/**
 * Converts a tree's regime count to an RGB color array for deck.gl
 * Red [255, 0, 0] for low/zero values → Green [0, 255, 0] for high values
 */
export function getTreeColorFromRegimes(
  regimes: number | null | undefined,
  minValue: number,
  maxValue: number
): [number, number, number, number] {
  // Handle null/undefined cases
  if (regimes == null || maxValue === minValue) {
    return [200, 200, 200, 255]; // Gray for null/undefined or no variation
  }

  // Normalize value between 0 and 1
  const normalized = Math.max(0, Math.min(1, (regimes - minValue) / (maxValue - minValue)));

  // Interpolate from red to green
  const red = Math.round(255 * (1 - normalized));
  const green = Math.round(255 * normalized);
  const blue = 0;
  const alpha = 255;

  return [red, green, blue, alpha];
}

/**
 * Calculate min and max regime values from dataset for efficient color mapping
 */
export function getRegimeRange(trees: Array<{ nombre_de_regimes_24_25?: number | null }>): {
  minValue: number;
  maxValue: number;
} {
  const values = trees
    .map(t => t.nombre_de_regimes_24_25)
    .filter((v): v is number => v != null);

  if (values.length === 0) {
    return { minValue: 0, maxValue: 1 };
  }

  return {
    minValue: Math.min(...values),
    maxValue: Math.max(...values),
  };
}
