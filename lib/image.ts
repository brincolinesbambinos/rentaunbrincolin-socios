const SUPABASE_URL = 'https://qsicmaprkrqpotrlcrmq.supabase.co'

/**
 * Converts a Supabase Storage public URL to a Supabase Image Transform URL.
 * Uses the /render/image/public/ endpoint to serve WebP at reduced resolution.
 *
 * Original:  https://...supabase.co/storage/v1/object/public/bucket/path.png
 * Optimized: https://...supabase.co/storage/v1/render/image/public/bucket/path.png?width=W&quality=Q&format=webp
 *
 * Falls back to the original URL for external images or non-Supabase URLs.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 480,
  quality: number = 75
): string {
  if (!url) return '/placeholder.png'
  if (!url.startsWith(SUPABASE_URL)) return url

  // Replace /object/public/ with /render/image/public/
  const transformed = url.replace(
    `${SUPABASE_URL}/storage/v1/object/public/`,
    `${SUPABASE_URL}/storage/v1/render/image/public/`
  )

  // If the replacement didn't happen (URL structure is different), return original
  if (transformed === url) return url

  // Append transform params.
  // Se pide un cuadro width × width con resize=contain: Supabase devuelve la
  // imagen COMPLETA dentro del cuadro. Solo con `width`, el render usaba el
  // modo por defecto (cover) y recortaba los lados: las fotos 1:1 llegaban
  // como tiras verticales y los juegos anchos se veían cortados.
  const separator = transformed.includes('?') ? '&' : '?'
  return `${transformed}${separator}width=${width}&height=${width}&resize=contain&quality=${quality}&format=webp`
}

/**
 * Compresses an image file using Canvas.
 * @param file The original image file
 * @param maxWidth Max width of the resulting image
 * @param maxHeight Max height of the resulting image
 * @param quality Quality from 0 to 1
 * @returns A promise that resolves to a new Blob/File
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
