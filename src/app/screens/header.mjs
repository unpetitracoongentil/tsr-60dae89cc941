// src/app/screens/header.mjs
import { el, render } from '../ui.mjs';
import { setHeader, setText, setOption, isExportable } from '../state.mjs';
import { saveDraft } from '../storage.mjs';

/**
 * Header blanks worth surfacing up front. A form often repeats the same blank on
 * every page (e.g. "Simulator Serial No." in each page header), so we group by
 * type and show ONE input, then write the value into every matching field.
 */
const FIELD_TYPES = [
  { key: 'serial', re: /serial/i, label: 'Serial #', required: true },
  { key: 'customer', re: /customer/i, label: 'Customer', required: false },
  { key: 'voltage', re: /voltage/i, label: 'Voltage', required: false },
];

export async function headerScreen(app) {
  render(app.topbar, el('h1', {}, 'Report details'));

  const groups = FIELD_TYPES
    .map((t) => ({ ...t, fields: app.fieldMap.textFields.filter((f) => t.re.test(f.label)) }))
    .filter((t) => t.fields.length > 0);

  const update = (type, value) => {
    // Fill every field of this type so the value prints on each page it appears.
    for (const f of type.fields) app.report = setText(app.report, f.id, value);
    if (type.key === 'serial') app.report = setHeader(app.report, { serial: value });
    saveDraft(app.store, app.draftId, app.report);
    next.disabled = !isExportable(app.report);
  };

  const next = el('button.primary', { onclick: () => app.go('#/checklist') }, 'Start checklist');
  next.disabled = !isExportable(app.report);

  // Pick-one header choices (job type, colour), rendered as button rows.
  const optionGroups = [];
  for (const o of app.fieldMap.options ?? []) {
    let g = optionGroups.find((x) => x.group === o.group);
    if (!g) optionGroups.push(g = { group: o.group, label: o.groupLabel, options: [] });
    g.options.push(o);
  }

  const optionRow = (g) => {
    const buttons = g.options.map((o) => {
      const btn = el('button.choice', {
        onclick: () => {
          app.report = setOption(app.report, g.group, o.label);
          for (const b of buttons) b.dataset.chosen = app.report.options[g.group] === b.dataset.label ? '1' : '';
          saveDraft(app.store, app.draftId, app.report);
        },
      }, o.label);
      btn.dataset.label = o.label;
      btn.dataset.chosen = app.report.options[g.group] === o.label ? '1' : '';
      return btn;
    });
    return el('label', {}, el('span', {}, g.label), el('div.choices', {}, ...buttons));
  };

  render(app.root,
    el('p.muted', {}, 'The serial number names the report file, so it is required.'),
    ...groups.map((t) =>
      el('label', {},
        el('span', {}, t.label + (t.required ? ' (required)' : '')),
        el('input', {
          value: app.report.textValues[t.fields[0].id] ?? '',
          oninput: (e) => update(t, e.target.value),
        }))),
    ...optionGroups.map(optionRow),
  );

  render(app.actionbar,
    el('button', { onclick: () => app.go('#/') }, 'Back'),
    next);
}
