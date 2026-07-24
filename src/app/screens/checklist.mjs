// src/app/screens/checklist.mjs
import { el, render } from '../ui.mjs';
import { toggleRow, tickCell, setText, progress } from '../state.mjs';
import { saveDraft } from '../storage.mjs';
import { MARK } from '../../lib/marks.mjs';

const GLYPH = { [MARK.PASS]: '✓', [MARK.FAIL]: '✗', [MARK.NA]: 'N/A', [MARK.BLANK]: '' };

export async function checklistScreen(app) {
  const counter = el('span.count', {});

  const refreshCount = () => {
    const { marked, total } = progress(app.report, app.fieldMap);
    counter.textContent = `${marked} of ${total}`;
  };

  render(app.topbar, el('h1', {}, 'Checklist'), counter);
  refreshCount();

  const save = () => saveDraft(app.store, app.draftId, app.report);

  // Grid cells are rendered as tables below, not as linear rows.
  const linearRows = app.fieldMap.rows.filter((r) => r.kind !== 'grid');

  // Group the linear rows by page then section, preserving paper order.
  const groups = new Map();
  for (const row of linearRows) {
    const key = `${row.page}-${row.section}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  // A pass/fail/na/single checklist row.
  const rowButton = (row) => {
    const mark = el('span.mark', {}, GLYPH[app.report.marks[row.id] ?? MARK.BLANK]);
    const node = el('button.row', {
      onclick: () => {
        app.report = toggleRow(app.report, row.id);
        const m = app.report.marks[row.id];
        node.dataset.mark = m;
        mark.textContent = GLYPH[m];
        refreshCount();
        save();
      },
    }, el('span.label', {}, row.label), mark);
    node.dataset.mark = app.report.marks[row.id] ?? MARK.BLANK;
    return node;
  };

  /**
   * Map each Notes blank to the section it actually sits under, by position.
   * Notes print directly below their section's rows, and a section's notes area
   * is usually several blank lines. Indexing notes by section number (the old
   * approach) mismatched them whenever a section had more than one notes line.
   */
  const notesBySection = new Map();
  {
    const lowestRowY = new Map();   // "page-section" -> lowest row y in it
    for (const r of linearRows) {
      if (r.section === undefined) continue;   // standalone rows own no notes area
      const key = `${r.page}-${r.section}`;
      const y = r.pass.y;
      if (!lowestRowY.has(key) || y < lowestRowY.get(key)) lowestRowY.set(key, y);
    }
    const notes = app.fieldMap.textFields.filter((f) => /^notes/i.test(f.label));
    for (const f of notes) {
      // Owning section = the one on this page whose rows sit closest above it.
      let best = null, bestY = Infinity;
      for (const [key, y] of lowestRowY) {
        const [p] = key.split('-').map(Number);
        if (p !== f.page || y <= f.y) continue;      // must be above this note
        if (y < bestY) { bestY = y; best = key; }
      }
      if (!best) continue;
      if (!notesBySection.has(best)) notesBySection.set(best, []);
      notesBySection.get(best).push(f);
    }
  }
  const notesFor = (page, section) => notesBySection.get(`${page}-${section}`) ?? [];

  const sections = [...groups.entries()].map(([key, rows]) => {
    const [page, section] = key.split('-').map(Number);
    const heading = Number.isFinite(section)
      ? `Page ${page} — section ${section + 1}`
      : `Page ${page} — additional checks`;
    return el('div.section', {},
      el('h2', {}, heading),
      ...rows.map(rowButton),
      ...notesFor(page, section).map((f) =>
        el('label', {},
          el('span', {}, f.label),
          el('textarea', {
            rows: 2,
            oninput: (e) => {
              app.report = setText(app.report, f.id, e.target.value);
              save();
            },
          }, app.report.textValues[f.id] ?? ''))));
  });

  render(app.root, ...sections, ...(app.fieldMap.grids ?? []).map(gridTable));

  render(app.actionbar,
    el('button', { onclick: () => app.go('#/header') }, 'Back'),
    el('button.primary', { onclick: () => app.go('#/review') }, 'Review & send'));

  // Build one grid section: a scrollable table of tap-to-tick cells.
  function gridTable(grid) {
    const cells = new Map();   // "gridRow-gridCol" -> row
    for (const r of app.fieldMap.rows) {
      if (r.grid === grid.id) cells.set(`${r.gridRow}-${r.gridCol}`, r);
    }

    const cycle = grid.mode === 'cycle';

    // 'tick' grids toggle blank<->✓; 'cycle' grids run the ✓/✗/N/A cycle.
    const cellButton = (cell) => {
      const markOf = () => app.report.marks[cell.id] ?? MARK.BLANK;
      const paint = () => {
        const m = markOf();
        btn.textContent = GLYPH[m];
        btn.dataset.mark = m;
        btn.dataset.ticked = m === MARK.PASS ? '1' : '';
      };
      const btn = el('button.tick', {
        title: cell.label,
        onclick: () => {
          app.report = cycle ? toggleRow(app.report, cell.id) : tickCell(app.report, cell.id);
          paint();
          save();
        },
      });
      paint();
      return btn;
    };

    const headRow = el('tr', {},
      el('th', {}, ''),
      ...grid.colLabels.map((c) => el('th', {}, c)));

    const bodyRows = grid.rowLabels.map((rowLabel, gr) =>
      el('tr', {},
        el('th.rowlabel', {}, rowLabel),
        ...grid.colLabels.map((_, gc) => {
          const cell = cells.get(`${gr}-${gc}`);
          return el('td', {}, cell ? cellButton(cell) : '');
        })));

    return el('div.section', {},
      el('h2', {}, grid.title),
      el('div.grid-scroll', {},
        el('table.grid-table', {},
          el('thead', {}, headRow),
          el('tbody', {}, ...bodyRows))));
  }
}
