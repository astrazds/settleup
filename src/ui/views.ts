import type { EventSummary } from '../domain'

export function renderCreatePage(error = ''): string {
  return documentPage({
    title: 'SettleUp',
    body: `
      <main class="create-shell">
        <section class="create-panel" aria-labelledby="create-title">
          <p class="eyebrow">Private-by-Link expense splitting</p>
          <h1 id="create-title">Create an Event</h1>
          <p class="intro">Track shared costs for one dinner, weekend, party, or errand run. Anyone with the Event Link can view and edit.</p>
          ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
          <form class="create-form" method="post" action="/events">
            <label>
              <span>Event Title</span>
              <input name="title" required autocomplete="off" placeholder="Sydney weekend">
            </label>
            <label>
              <span>Currency</span>
              <select name="currency" required>
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="NZD">NZD</option>
              </select>
            </label>
            <label>
              <span>Your name</span>
              <input name="displayName" required autocomplete="name" placeholder="Sarah">
            </label>
            <button type="submit">Create Event</button>
          </form>
        </section>
      </main>
    `
  })
}

export function renderEventPage(event: EventSummary): string {
  return documentPage({
    title: `${event.title} - SettleUp`,
    body: `
      <main id="app" data-token="${escapeHtml(event.token)}" class="app-shell">
        <section class="loading-panel">
          <p class="eyebrow">SettleUp</p>
          <h1>${escapeHtml(event.title)}</h1>
          <p>Loading Event...</p>
        </section>
      </main>
      <script src="/static/client.js" type="module"></script>
    `
  })
}

export function renderNotFoundPage(): string {
  return documentPage({
    title: 'Event not found - SettleUp',
    body: `
      <main class="create-shell">
        <section class="create-panel" aria-labelledby="missing-title">
          <p class="eyebrow">Event not found</p>
          <h1 id="missing-title">This Event Link does not work</h1>
          <p class="intro">The Event may not exist, or the Event Link may have been copied incorrectly.</p>
          <a class="button-link" href="/">Create a new Event</a>
        </section>
      </main>
    `
  })
}

export const stylesheet = `
:root {
  color-scheme: light;
  --paper: oklch(98% 0.006 78);
  --surface: oklch(94.5% 0.008 78);
  --panel: oklch(99% 0.004 78);
  --text: oklch(21% 0.018 72);
  --muted: oklch(48% 0.018 72);
  --line: oklch(85% 0.012 78);
  --accent: oklch(49% 0.13 161);
  --accent-strong: oklch(38% 0.12 161);
  --danger: oklch(50% 0.16 28);
  --success: oklch(43% 0.12 145);
  --focus: oklch(60% 0.16 161);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--text);
  font-size: 15px;
  line-height: 1.45;
}
a { color: var(--accent-strong); }
button, input, select {
  font: inherit;
}
button, .button-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent);
  color: oklch(98% 0.006 161);
  padding: 0 14px;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
}
button.secondary {
  background: var(--panel);
  color: var(--text);
  border-color: var(--line);
}
button.danger {
  background: var(--panel);
  color: var(--danger);
  border-color: oklch(82% 0.05 28);
}
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 3px solid color-mix(in oklch, var(--focus), transparent 68%);
  outline-offset: 2px;
}
input, select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--text);
  min-height: 40px;
  padding: 8px 10px;
}
label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}
label span { color: var(--muted); }
.create-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}
.create-panel, .loading-panel {
  width: min(560px, 100%);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 28px;
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0;
}
h1, h2, h3, p { margin-top: 0; }
h1 { font-size: 30px; line-height: 1.15; margin-bottom: 12px; }
h2 { font-size: 18px; line-height: 1.2; margin-bottom: 12px; }
h3 { font-size: 15px; line-height: 1.25; margin-bottom: 8px; }
.intro { color: var(--muted); max-width: 68ch; }
.create-form { display: grid; gap: 14px; margin-top: 22px; }
.error {
  border: 1px solid oklch(82% 0.05 28);
  background: oklch(96% 0.018 28);
  color: var(--danger);
  border-radius: 8px;
  padding: 10px 12px;
}
.app-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 20px;
}
.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.topbar h1 { margin-bottom: 4px; }
.subtle { color: var(--muted); }
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
}
.section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.stack { display: grid; gap: 10px; }
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
.row:first-child { border-top: 0; padding-top: 0; }
.amount-positive { color: var(--success); font-weight: 700; }
.amount-negative { color: var(--danger); font-weight: 700; }
.amount-zero { color: var(--muted); font-weight: 650; }
.inline-form, .share-list {
  display: grid;
  gap: 10px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.share-row {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(100px, 140px) auto;
  gap: 8px;
  align-items: end;
}
.empty {
  color: var(--muted);
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 12px;
}
.identity-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
@media (max-width: 820px) {
  .app-shell { padding: 14px; }
  .topbar, .grid { display: block; }
  .form-grid, .share-row { grid-template-columns: 1fr; }
  h1 { font-size: 25px; }
}
`

function documentPage({ title, body }: { title: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
${body}
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
