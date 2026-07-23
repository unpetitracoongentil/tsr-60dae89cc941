// src/app/photos.mjs
// Browser-only helpers for turning picked image files into report photos.
// Kept out of state.mjs so that module stays pure and Node-testable.

const MAX_DIM = 1600;   // longest edge in px; keeps exported PDFs shareable
const QUALITY = 0.8;    // JPEG quality after downscale

/**
 * Read an image File, downscale so its longest edge is at most MAX_DIM, and
 * re-encode as JPEG. Returns { type, bytes } ready for addPhoto().
 * Phone photos are multi-megabyte; without this a few would bloat the PDF.
 */
export async function fileToPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', QUALITY));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { type: 'image/jpeg', bytes };
}

/** A previewable object URL for a stored photo. Caller must revoke it. */
export function photoUrl(photo) {
  return URL.createObjectURL(new Blob([photo.bytes], { type: photo.type }));
}
