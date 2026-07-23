// src/lib/naming.mjs

const ILLEGAL = /[/\\:*?"<>|]/g;

/** Uppercase, strip filename-illegal characters, collapse whitespace. */
export function normalizeSerial(serial) {
  return String(serial ?? '')
    .replace(ILLEGAL, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/** A serial is usable if it has any content once normalized. */
export function isValidSerial(serial) {
  return normalizeSerial(serial).length > 0;
}

/** Build the report filename: YYYY-MM-DD-SERIAL.pdf */
export function reportFilename(dateISO, serial) {
  const s = normalizeSerial(serial);
  if (!s) throw new Error('A serial number is required to name the report.');
  return `${dateISO}-${s}.pdf`;
}
