// src/app/state.mjs
import { MARK, nextMark, isMarked } from '../lib/marks.mjs';
import { normalizeSerial, isValidSerial } from '../lib/naming.mjs';
import { todayISO } from '../lib/dates.mjs';

/**
 * The report is a plain, serializable value. Every update returns a new object
 * so a draft can be written to storage without worrying about aliasing.
 */
export function createReport(form) {
  return {
    form,
    serial: '',
    inspector: '',
    date: todayISO(),
    marks: {},
    textValues: {},
    photos: [],
    updatedAt: Date.now(),
  };
}

/** Advance one row around the tap cycle. */
export function toggleRow(report, rowId) {
  return {
    ...report,
    marks: { ...report.marks, [rowId]: nextMark(report.marks[rowId]) },
    updatedAt: Date.now(),
  };
}

/** Merge header fields. The serial is normalized on the way in. */
export function setHeader(report, patch) {
  const next = { ...report, ...patch, updatedAt: Date.now() };
  if (patch.serial !== undefined) next.serial = normalizeSerial(patch.serial);
  return next;
}

/** Set one text field's typed value. */
export function setText(report, fieldId, value) {
  return {
    ...report,
    textValues: { ...report.textValues, [fieldId]: value },
    updatedAt: Date.now(),
  };
}

/** How many checklist rows carry a mark, out of how many exist. */
export function progress(report, fieldMap) {
  const marked = fieldMap.rows.filter((r) => isMarked(report.marks[r.id])).length;
  return { marked, total: fieldMap.rows.length };
}

/** A report cannot be exported without a serial — the filename depends on it. */
export function isExportable(report) {
  return isValidSerial(report.serial);
}

/** Append a photo. Bytes are the raw image file; caption is optional. */
export function addPhoto(report, { type, bytes, caption = '' }) {
  const photo = { id: crypto.randomUUID(), type, bytes, caption };
  return { ...report, photos: [...report.photos, photo], updatedAt: Date.now() };
}

/** Drop a photo by id. */
export function removePhoto(report, id) {
  return { ...report, photos: report.photos.filter((p) => p.id !== id), updatedAt: Date.now() };
}

/** Set one photo's caption. */
export function setPhotoCaption(report, id, caption) {
  return {
    ...report,
    photos: report.photos.map((p) => (p.id === id ? { ...p, caption } : p)),
    updatedAt: Date.now(),
  };
}

export { MARK };
