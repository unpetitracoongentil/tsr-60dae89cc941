// src/app/screens/checklist.mjs
import { el, render } from '../ui.mjs';
import { toggleRow, setText, progress } from '../state.mjs';
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

  // Group rows by page then section, preserving the order they appear on paper.
  const groups = new Map();
  for (const row of app.fieldMap.rows) {
    const key = `${row.page}-${row.section}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const rowButton = (row) => {
    const mark = el('span.mark', {}, GLYPH[app.report.marks[row.id] ?? MARK.BLANK]);
    const node = el('button.row', {
      onclick: () => {
        app.report = toggleRow(app.report, row.id);
        const m = app.report.marks[row.id];
        node.dataset.mark = m;
        mark.textContent = GLYPH[m];
        refreshCount();
        saveDraft(app.store, app.draftId, app.report);
      },
    }, el('span.label', {}, row.label), mark);
    node.dataset.mark = app.report.marks[row.id] ?? MARK.BLANK;
    return node;
  };

  const notesFor = (page, section) =>
    app.fieldMap.textFields.filter((f) => f.page === page && /^notes/i.test(f.label))
      .slice(section, section + 1);

  const sections = [...groups.entries()].map(([key, rows]) => {
    const [page, section] = key.split('-').map(Number);
    return el('div.section', {},
      el('h2', {}, `Page ${page} — section ${section + 1}`),
      ...rows.map(rowButton),
      ...notesFor(page, section).map((f) =>
        el('label', {},
          el('span', {}, f.label),
          el('textarea', {
            rows: 2,
            oninput: (e) => {
              app.report = setText(app.report, f.id, e.target.value);
              saveDraft(app.store, app.draftId, app.report);
            },
          }, app.report.textValues[f.id] ?? ''))));
  });

  render(app.root, ...sections);
  render(app.actionbar,
    el('button', { onclick: () => app.go('#/header') }, 'Back'),
    el('button.primary', { onclick: () => app.go('#/review') }, 'Review & send'));
}
