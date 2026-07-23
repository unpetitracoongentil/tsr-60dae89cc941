// src/app/screens/picker.mjs
import { el, render } from '../ui.mjs';
import { createReport } from '../state.mjs';
import { listDrafts, loadDraft, deleteDraft } from '../storage.mjs';
import { readSettings, writeSettings } from '../settings.mjs';

export async function pickerScreen(app) {
  render(app.topbar, el('h1', {}, 'TSR Report'));

  const settings = readSettings(localStorage);
  const drafts = await listDrafts(app.store);

  const start = async (form) => {
    app.fieldMap = await loadFieldMap(form.id);
    // Re-read settings: the name may have been typed into the field just now,
    // after the value captured above at render time.
    app.report = { ...createReport(form.id), inspector: readSettings(localStorage).inspector };
    app.draftId = `${form.id}-${Date.now()}`;
    app.go('#/header');
  };

  const resume = async (d) => {
    app.fieldMap = await loadFieldMap(d.report.form);
    app.report = d.report;
    app.draftId = d.id;
    app.go('#/checklist');
  };

  render(app.root,
    el('label', {},
      el('span', {}, 'Your name (remembered, autofilled at the end)'),
      el('input', {
        value: settings.inspector,
        placeholder: 'e.g. E. Phu',
        oninput: (e) => writeSettings(localStorage, { inspector: e.target.value }),
      })),

    el('h2.section-title', {}, 'New report'),
    ...app.forms.map((f) =>
      el('button.card', { onclick: () => start(f) },
        el('div', {}, f.name),
        el('div.muted', {}, f.subtitle))),

    drafts.length ? el('h2.section-title', {}, 'Unfinished') : null,
    ...drafts.map((d) =>
      el('div.card', {},
        el('button', { onclick: () => resume(d) },
          `${d.report.form} — ${d.report.serial || 'no serial yet'}`),
        el('div.muted', {}, new Date(d.updatedAt).toLocaleString()),
        el('button', {
          onclick: async () => { await deleteDraft(app.store, d.id); pickerScreen(app); },
        }, 'Delete'))),
  );
}

async function loadFieldMap(formId) {
  const res = await fetch(`./fields/${formId}.json`);
  if (!res.ok) throw new Error(`Field map missing for ${formId}`);
  return res.json();
}
