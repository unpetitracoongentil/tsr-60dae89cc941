// src/lib/draw-glyphs.mjs

const seg = (x1, y1, x2, y2) => ({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });

/**
 * A tick centred on (cx, cy), fitting a size x size box.
 * Short down-stroke into a long up-stroke, the way a pen makes it.
 */
export function checkStrokes(cx, cy, size) {
  const h = size / 2;
  return [
    seg(cx - h, cy, cx - h * 0.25, cy - h),
    seg(cx - h * 0.25, cy - h, cx + h, cy + h),
  ];
}

/** An X centred on (cx, cy), fitting a size x size box. */
export function crossStrokes(cx, cy, size) {
  const h = size / 2;
  return [
    seg(cx - h, cy - h, cx + h, cy + h),
    seg(cx - h, cy + h, cx + h, cy - h),
  ];
}
