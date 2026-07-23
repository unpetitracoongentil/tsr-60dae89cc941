// src/app/screens/header.mjs
import { el, render } from '../ui.mjs';
import { setHeader, setText, isExportable } from '../state.mjs';
import { saveDraft } from '../storage.mjs';

/** Header blanks worth surfacing up front, matched by their extracted label. */
const UP_FRONT = [/serial/i, /customer/i, /voltage/i];

export async function headerScreen(app) {
  render(app.topbar, el('h1', {}, 'Report details'));

  const fields = app.fieldMap.textFields.filter((f) =>
    UP_FRONT.some((re) => re.test(f.label)));

  const serialField = fields.find((f) => /serial/i.test(f.label));

  const update = (field, value) => {
    app.report = setText(app.report, field.id, value);
    if (field === serialField) app.report = setHeader(app.report, { serial: value });
    saveDraft(app.store, app.draftId, app.report);
    next.disabled = !isExportable(app.report);
  };

  const next = el('button.primary', { onclick: () => app.go('#/checklist') }, 'Start checklist');
  next.disabled = !isExportable(app.report);

  render(app.root,
    el('p.muted', {}, 'The serial number names the report file, so it is required.'),
    ...fields.map((f) =>
      el('label', {},
        el('span', {}, f.label + (f === serialField ? ' (required)' : '')),
        el('input', {
          value: app.report.textValues[f.id] ?? '',
          oninput: (e) => update(f, e.target.value),
        }))),
  );

  render(app.actionbar,
    el('button', { onclick: () => app.go('#/') }, 'Back'),
    next);
}
