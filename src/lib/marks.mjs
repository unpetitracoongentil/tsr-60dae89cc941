// src/lib/marks.mjs

export const MARK = Object.freeze({
  BLANK: 'blank',
  PASS: 'pass',
  FAIL: 'fail',
  NA: 'na',
});

const CYCLE = [MARK.BLANK, MARK.PASS, MARK.FAIL, MARK.NA];

/** Advance one step around the tap cycle. Unknown/absent values start at blank. */
export function nextMark(current) {
  const i = CYCLE.indexOf(current);
  const from = i < 0 ? 0 : i;          // an unknown value is treated as blank
  return CYCLE[(from + 1) % CYCLE.length];
}

/** A row counts as marked once it is anything other than blank. */
export function isMarked(mark) {
  return mark !== undefined && mark !== MARK.BLANK;
}

/** How many rows still carry no mark. */
export function countUnmarked(rows, values) {
  return rows.filter((r) => !isMarked(values[r.id])).length;
}
