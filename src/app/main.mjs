// src/app/main.mjs
import { render } from './ui.mjs';
import { createIndexedDbStore } from './storage.mjs';
import { createMemoryStore } from './memory-store.mjs';
import { pickerScreen } from './screens/picker.mjs';
import { headerScreen } from './screens/header.mjs';
import { checklistScreen } from './screens/checklist.mjs';
import { reviewScreen } from './screens/review.mjs';

const FORMS = [
  { id: 's2000-susie', name: 'S2000 Susie', subtitle: 'Final Inspection Form' },
  { id: 's3005-hal', name: 'S3005 Pediatric HAL', subtitle: 'Five Year Old — Final Inspection' },
];

const app = {
  root: document.getElementById('app'),
  topbar: document.getElementById('topbar'),
  actionbar: document.getElementById('actionbar'),
  forms: FORMS,
  store: safeStore(),
  fieldMap: null,
  report: null,
  draftId: null,
  go(route) { location.hash = route; },
};

/** IndexedDB is unavailable in some private-browsing modes; degrade, don't crash. */
function safeStore() {
  try {
    if (typeof indexedDB !== 'undefined') return createIndexedDbStore();
  } catch { /* fall through */ }
  return createMemoryStore();
}

const ROUTES = {
  '': pickerScreen,
  '#/': pickerScreen,
  '#/header': headerScreen,
  '#/checklist': checklistScreen,
  '#/review': reviewScreen,
};

async function route() {
  const screen = ROUTES[location.hash] ?? pickerScreen;
  // Any screen other than the picker needs a loaded report.
  if (screen !== pickerScreen && !app.report) return app.go('#/');
  render(app.actionbar);
  await screen(app);
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline is a bonus */ });
}
