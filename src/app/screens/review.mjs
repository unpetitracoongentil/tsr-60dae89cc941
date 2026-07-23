// src/app/screens/review.mjs
import { el, render } from '../ui.mjs';
import { setHeader, progress, isExportable } from '../state.mjs';
import { deleteDraft } from '../storage.mjs';
import { deliver, browserEnv } from '../share.mjs';
import { stampReport } from '../../lib/stamp.mjs';
import { reportFilename } from '../../lib/naming.mjs';
import { writeSettings } from '../settings.mjs';

/** Sign-off blanks, filled from the report rather than typed on the checklist. */
const SIGN_OFF = { inspector: /inspected by/i, date: /^date/i };

export async function reviewScreen(app) {
  render(app.topbar, el('h1', {}, 'Review & send'));

  const { marked, total } = progress(app.report, app.fieldMap);
  const unmarked = total - marked;
  const status = el('p.muted', {});

  const build = async () => {
    const res = await fetch(`./${app.fieldMap.template}`);
    const template = new Uint8Array(await res.arrayBuffer());

    // Autofilled sign-off values are merged in at export, not stored per-keystroke.
    const textValues = { ...app.report.textValues };
    for (const [key, re] of Object.entries(SIGN_OFF)) {
      const field = app.fieldMap.textFields.find((f) => re.test(f.label));
      if (field) textValues[field.id] = app.report[key];
    }

    return stampReport(template, app.fieldMap, { marks: app.report.marks, textValues });
  };

  const send = async () => {
    status.textContent = 'Building PDF…';
    try {
      const bytes = await build();
      const name = reportFilename(app.report.date, app.report.serial);
      const how = await deliver(bytes, name, browserEnv());
      status.textContent = {
        shared: `Shared ${name}`,
        downloaded: `Saved ${name}`,
        cancelled: 'Sharing cancelled — the report is still here.',
      }[how];
      if (how !== 'cancelled') await deleteDraft(app.store, app.draftId);
    } catch (err) {
      status.textContent = `Could not build the report: ${err.message}`;
    }
  };

  render(app.root,
    unmarked > 0
      ? el('div.warn', {},
          `${unmarked} of ${total} rows are unmarked. They will export blank, exactly as they would on paper.`)
      : null,

    el('label', {},
      el('span', {}, 'Inspected by'),
      el('input', {
        value: app.report.inspector,
        oninput: (e) => {
          app.report = setHeader(app.report, { inspector: e.target.value });
          writeSettings(localStorage, { inspector: e.target.value });
        },
      })),

    el('label', {},
      el('span', {}, 'Date'),
      el('input', {
        type: 'date',
        value: app.report.date,
        oninput: (e) => { app.report = setHeader(app.report, { date: e.target.value }); },
      })),

    el('p', {}, 'File name: ',
      el('strong', {}, isExportable(app.report)
        ? reportFilename(app.report.date, app.report.serial)
        : 'a serial number is required')),

    status,
  );

  const sendBtn = el('button.primary', { onclick: send }, 'Share');
  sendBtn.disabled = !isExportable(app.report);

  render(app.actionbar,
    el('button', { onclick: () => app.go('#/checklist') }, 'Back'),
    sendBtn);
}
