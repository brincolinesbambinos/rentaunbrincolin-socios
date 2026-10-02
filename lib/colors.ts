/**
 * Determines if a hex color is light or dark and returns an appropriate contrast color.
 * @param hexColor The hex color string (with or without #)
 * @returns '#000000' for light backgrounds, '#FFFFFF' for dark backgrounds
 */
export function getContrastColor(hexColor: string | null | undefined): string {
  if (!hexColor) return '#FFFFFF';
  
  // Remove hash if present
  const color = hexColor.replace('#', '');
  
  // If it's a 3-character hex, expand it
  let r, g, b;
  if (color.length === 3) {
    r = parseInt(color[0] + color[0], 16);
    g = parseInt(color[1] + color[1], 16);
    b = parseInt(color[2] + color[2], 16);
  } else if (color.length === 6) {
    r = parseInt(color.substr(0, 2), 16);
    g = parseInt(color.substr(2, 2), 16);
    b = parseInt(color.substr(4, 2), 16);
  } else {
    return '#FFFFFF'; // Fallback
  }
  
  // Calculate relative luminance (using CCIR 601 formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // If luminance is high (> 0.6), use dark text. Otherwise, use light text.
  // Using 0.6 as threshold to catch yellow and light greens
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}
