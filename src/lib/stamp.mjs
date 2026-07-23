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

  // --- appended photo pages ---
  for (const photo of values.photos ?? []) {
    try {
      const img = /png/i.test(photo.type)
        ? await doc.embedPng(photo.bytes)
        : await doc.embedJpg(photo.bytes);
      drawPhotoPage(doc, helvetica, img, photo.caption ?? '');
    } catch {
      // A single unreadable image must not fail the whole report; skip it.
    }
  }

  return doc.save();
}

const PAGE_W = 612;
const PAGE_H = 792;
const PAGE_MARGIN = 36;
const CAPTION_BAND = 28;
const CAPTION_SIZE = 11;

function drawPhotoPage(doc, font, img, caption) {
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const availW = PAGE_W - PAGE_MARGIN * 2;
  const availH = PAGE_H - PAGE_MARGIN * 2 - CAPTION_BAND;
  const factor = Math.min(availW / img.width, availH / img.height, 1);
  const w = img.width * factor;
  const h = img.height * factor;
  const x = (PAGE_W - w) / 2;
  const y = PAGE_MARGIN + CAPTION_BAND + (availH - h) / 2;
  page.drawImage(img, { x, y, width: w, height: h });

  const text = String(caption).trim();
  if (text) {
    const tw = font.widthOfTextAtSize(text, CAPTION_SIZE);
    page.drawText(text, {
      x: Math.max(PAGE_MARGIN, (PAGE_W - tw) / 2),
      y: PAGE_MARGIN,
      size: CAPTION_SIZE,
      font,
      color: INK,
      maxWidth: availW,
    });
  }
}

function drawGlyph(page, strokesFor, cell) {
  const isBox = (cell.h ?? 0) >= 4;   // checkbox annotation vs a hairline rule
  const cx = cell.x + cell.w / 2;
  // A box gets a mark centred inside it, sized to fit; a rule gets a mark
  // resting just above the line.
  const size = isBox ? Math.min(cell.w, cell.h) * 0.95 : GLYPH_SIZE;
  const cy = isBox ? cell.y + cell.h / 2 : cell.y + GLYPH_LIFT + GLYPH_SIZE / 2;
  for (const line of strokesFor(cx, cy, size)) {
    page.drawLine({ ...line, thickness: STROKE, color: INK });
  }
}
