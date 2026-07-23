// src/lib/stamp.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MARK } from './marks.mjs';
import { checkStrokes, crossStrokes } from './draw-glyphs.mjs';

const INK = rgb(0, 0, 0);
const GLYPH_SIZE = 9;      // pt, sized to sit comfortably above a 34pt rule
const GLYPH_LIFT = 1.5;    // pt above the rule, so the mark rests on the line
const STROKE = 1.1;
const NA_SIZE = 8;
const TEXT_SIZE = 9;
const TEXT_LIFT = 2;

/**
 * Draw marks and text onto the original PDF.
 *
 * The original bytes are loaded and appended to; nothing is re-laid-out or
 * re-encoded, so images, fonts and spacing are carried through untouched.
 *
 * @param {Uint8Array} templateBytes original PDF, not mutated
 * @param {object} fieldMap fields/<form>.json
 * @param {{marks: Record<string,string>, textValues: Record<string,string>}} values
 * @returns {Promise<Uint8Array>} the stamped PDF
 */
export async function stampReport(templateBytes, fieldMap, values) {
  const doc = await PDFDocument.load(templateBytes.slice());
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);

  const rowsById = new Map(fieldMap.rows.map((r) => [r.id, r]));
  const fieldsById = new Map(fieldMap.textFields.map((f) => [f.id, f]));

  for (const [id, mark] of Object.entries(values.marks ?? {})) {
    const row = rowsById.get(id);
    if (!row || mark === MARK.BLANK) continue;
    const page = doc.getPage(row.page - 1);
    if (!page) continue;

    if (mark === MARK.PASS) drawGlyph(page, checkStrokes, row.pass);
    else if (mark === MARK.FAIL) drawGlyph(page, crossStrokes, row.fail);
    else if (mark === MARK.NA) {
      const label = 'N/A';
      const width = helvetica.widthOfTextAtSize(label, NA_SIZE);
      page.drawText(label, {
        x: row.pass.x + row.pass.w / 2 - width / 2,
        y: row.pass.y + GLYPH_LIFT,
        size: NA_SIZE,
        font: helvetica,
        color: INK,
      });
    }
  }

  for (const [id, text] of Object.entries(values.textValues ?? {})) {
    const field = fieldsById.get(id);
    if (!field || !String(text).trim()) continue;
    const page = doc.getPage(field.page - 1);
    if (!page) continue;
    page.drawText(String(text), {
      x: field.x + 1,
      y: field.y + TEXT_LIFT,
      size: TEXT_SIZE,
      font: helvetica,
      color: INK,
      maxWidth: field.w,
    });
  }

  return doc.save();
}

function drawGlyph(page, strokesFor, cell) {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + GLYPH_LIFT + GLYPH_SIZE / 2;
  for (const line of strokesFor(cx, cy, GLYPH_SIZE)) {
    page.drawLine({ ...line, thickness: STROKE, color: INK });
  }
}
