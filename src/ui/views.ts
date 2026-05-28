import { supportedCurrencies } from '../domain'
import type { EventSummary } from '../domain'

export function renderCreatePage(error = ''): string {
  const errorMarkup = error ? `              <p class="error" role="alert">${escapeHtml(error)}</p>
` : ''
  const currencyOptions = supportedCurrencies
    .map((currency) => `                      <option value="${currency}">${currency}</option>`)
    .join('\n')

  return documentPage({
    title: 'SettleUp',
    body: `
      <main class="create-shell">
        <section class="create-card" aria-labelledby="create-title">
          <div class="brand"><span class="mark" aria-hidden="true"><span></span><span></span></span><span>SettleUp</span></div>
          <div class="create-copy">
            <h1 id="create-title">Split costs, easy...done...</h1>
            <p class="muted">Share the link. Add people and expenses. Pay them.</p>
          </div>
          <form class="form create-form" method="post" action="/events">
${errorMarkup}
            <label>
              <span>Event Title</span>
              <input type="text" name="title" required autocomplete="off" placeholder="Sydney weekend">
            </label>
            <div class="form-grid">
              <label>
                <span>Currency</span>
                <select name="currency" required>
${currencyOptions}
                </select>
              </label>
              <label>
                <span>Your name</span>
                <input type="text" name="displayName" required autocomplete="name" placeholder="Sarah">
              </label>
            </div>
            <button type="submit">Create Event</button>
          </form>
          <p class="privacy-note">Anyone with the Event Link can view and edit.</p>
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
        <section class="create-card" aria-labelledby="missing-title">
          <div class="brand"><span class="mark" aria-hidden="true"><span></span><span></span></span><span>SettleUp</span></div>
          <div class="panel">
            <div class="panel-body">
              <p class="eyebrow">Event not found</p>
              <h1 id="missing-title">This Event Link does not work</h1>
              <p class="muted">The Event may not exist, or the Event Link may have been copied incorrectly.</p>
              <a class="button-link" href="/">Create a new Event</a>
            </div>
          </div>
        </section>
      </main>
    `
  })
}

export const stylesheet = `
:root {
  color-scheme: light;
  --paper: oklch(97.5% 0.008 82);
  --sheet: oklch(99% 0.005 82);
  --wash: oklch(94.5% 0.012 82);
  --ink: oklch(22% 0.018 70);
  --muted: oklch(49% 0.02 70);
  --rule: oklch(84.5% 0.014 82);
  --ledger: oklch(46% 0.12 157);
  --ledger-deep: oklch(35% 0.11 157);
  --ledger-wash: oklch(94.5% 0.035 157);
  --ledger-rule: oklch(78% 0.055 157);
  --on-ledger: oklch(98% 0.006 157);
  --clay: oklch(49% 0.13 31);
  --clay-deep: oklch(38% 0.12 31);
  --clay-wash: oklch(95% 0.028 31);
  --clay-rule: oklch(78% 0.055 31);
  --amber: oklch(67% 0.12 78);
  --amber-deep: oklch(43% 0.095 78);
  --amber-wash: oklch(94.5% 0.035 78);
  --amber-rule: oklch(80% 0.065 78);
  --focus: oklch(62% 0.16 157);
  --shadow: 0 18px 50px color-mix(in oklch, var(--ink), transparent 91%);
  --space-sm: 10px;
  --space-md: 14px;
  --space-lg: 20px;
  --space-xl: 28px;
  --space-2xl: 40px;
  --text-caption: 0.75rem;
  --text-small: 0.875rem;
  --text-body: 1rem;
  --text-subheading: 1.125rem;
  --text-heading: 1.5rem;
  --text-display: 1.875rem;
  --weight-strong: 700;
  --weight-heavy: 750;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-kerning: normal;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-size: var(--text-body);
  line-height: 1.5;
}
a { color: var(--ledger-deep); }
button, input, select {
  font: inherit;
}
button, .button-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border: 1px solid var(--ledger);
  border-radius: 8px;
  background: var(--ledger);
  color: var(--on-ledger);
  padding: 0 14px;
  font-weight: var(--weight-strong);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 160ms ease-out, border-color 160ms ease-out, color 160ms ease-out, transform 120ms ease-out;
}
button:hover, .button-link:hover {
  background: var(--ledger-deep);
  border-color: var(--ledger-deep);
}
button:active, .button-link:active {
  transform: translateY(1px);
}
button[disabled] {
  cursor: not-allowed;
  background: var(--wash);
  border-color: var(--rule);
  color: var(--muted);
}
button.secondary {
  background: var(--sheet);
  color: var(--ink);
  border-color: var(--rule);
}
button.secondary:hover {
  background: var(--wash);
  border-color: color-mix(in oklch, var(--rule), var(--ink) 18%);
}
button.danger {
  background: var(--sheet);
  color: var(--clay);
  border-color: color-mix(in oklch, var(--clay), var(--rule) 70%);
}
button.danger:hover {
  background: var(--clay-wash);
  border-color: var(--clay-rule);
}
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 3px solid color-mix(in oklch, var(--focus), transparent 68%);
  outline-offset: 2px;
}
input, select {
  width: 100%;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--sheet);
  color: var(--ink);
  min-height: 40px;
  padding: 8px 10px;
}
label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: var(--weight-strong);
}
label span { color: var(--muted); }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
}
h1, h2, h3, p { margin-top: 0; }
h1 {
  font-size: var(--text-heading);
  line-height: 1.16;
  margin-bottom: var(--space-sm);
  font-weight: var(--weight-heavy);
  letter-spacing: 0;
}
h2 {
  font-size: var(--text-subheading);
  line-height: 1.25;
  margin-bottom: 12px;
  font-weight: var(--weight-strong);
  letter-spacing: 0;
}
h3 {
  font-size: var(--text-body);
  line-height: 1.25;
  margin-bottom: 4px;
  font-weight: var(--weight-strong);
  letter-spacing: 0;
}
.create-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-xl) var(--space-lg);
}
.create-card {
  display: grid;
  gap: 16px;
  width: min(460px, 100%);
}
.create-card h1 {
  max-width: 16ch;
  font-size: var(--text-display);
  line-height: 1.12;
  margin-bottom: 8px;
}
.create-copy {
  display: grid;
  gap: 0;
}
.create-copy .muted {
  max-width: 34ch;
  margin: 0;
}
.create-form {
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--sheet);
  padding: 16px;
}
.panel, .loading-panel {
  background: var(--sheet);
  border: 1px solid var(--rule);
  border-radius: 8px;
}
.panel-body {
  padding: 16px;
}
.loading-panel {
  width: min(560px, 100%);
  padding: 16px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--ink);
  font-weight: var(--weight-heavy);
}
.mark {
  display: grid;
  gap: 4px;
  width: 24px;
}
.mark span {
  display: block;
  height: 5px;
  border-radius: 4px;
  background: var(--ledger);
}
.mark span:first-child {
  width: 18px;
  margin-left: 6px;
}
.mark span:last-child {
  width: 18px;
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--ledger-deep);
  font-size: var(--text-caption);
  font-weight: var(--weight-heavy);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.muted, .subtle { color: var(--muted); }
.form {
  display: grid;
  gap: 12px;
}
.privacy-note {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-small);
  line-height: 1.4;
}
.error {
  border: 1px solid var(--clay-rule);
  background: var(--clay-wash);
  color: var(--clay-deep);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: var(--text-small);
  line-height: 1.35;
}
.app-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: var(--space-lg);
}
.app-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: var(--space-md);
}
.app-top h1 { margin-bottom: 4px; }
.event-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.event-title-line [data-event-title] {
  min-width: 0;
}
.icon-button {
  flex: 0 0 auto;
  width: 40px;
  min-height: 40px;
  padding: 0;
  border-color: var(--rule);
  background: var(--sheet);
  color: var(--ink);
}
.icon-button:hover {
  background: var(--wash);
  border-color: color-mix(in oklch, var(--rule), var(--ink) 18%);
}
.copy-icon {
  position: relative;
  display: block;
  width: 17px;
  height: 17px;
}
.copy-icon::before,
.copy-icon::after {
  content: "";
  position: absolute;
  width: 11px;
  height: 13px;
  border: 2px solid currentColor;
  border-radius: 3px;
  background: var(--sheet);
}
.copy-icon::before {
  top: 0;
  right: 0;
}
.copy-icon::after {
  left: 0;
  bottom: 0;
}
.top-tools {
  display: grid;
  justify-items: end;
  gap: 8px;
}
.app-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
  gap: var(--space-md);
  align-items: start;
}
.app-grid > [data-testid="event-history-panel"] {
  grid-column: 1 / -1;
}
.column-stack {
  display: grid;
  gap: var(--space-md);
}
.section {
  background: var(--sheet);
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}
.section + .section {
  margin-top: var(--space-md);
}
.column-stack .section + .section,
.app-grid > .section + .section {
  margin-top: 0;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--rule);
  background: color-mix(in oklch, var(--wash), var(--sheet) 50%);
}
.section-head h2 {
  margin: 0;
}
.section-head .amount,
.section-head .chip {
  font-size: var(--text-small);
}
.stack { display: grid; gap: 10px; }
.ledger-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px 14px;
  border-top: 1px solid color-mix(in oklch, var(--rule), transparent 28%);
}
.ledger-row > div {
  min-width: 0;
}
.ledger-row:first-child {
  border-top: 0;
}
.ledger-row.row-positive { background: color-mix(in oklch, var(--ledger-wash), var(--sheet) 35%); }
.ledger-row.row-negative { background: color-mix(in oklch, var(--clay-wash), var(--sheet) 30%); }
.amount {
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-heavy);
  white-space: nowrap;
}
.amount-positive { color: var(--ledger-deep); }
.amount-negative { color: var(--clay); }
.amount-zero { color: var(--muted); }
.inline-form {
  display: grid;
  gap: 12px;
  padding: 16px;
}
.compact-form {
  padding: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.expense-entry-row {
  grid-template-columns: minmax(0, 1fr) minmax(96px, 120px) auto;
  align-items: end;
}
.expense-entry-row button[type="submit"] {
  min-width: 76px;
}
.row-actions,
.mobile-actions,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.balance-actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}
.balance-actions button {
  min-height: 36px;
  padding-inline: 12px;
}
.included-panel {
  display: grid;
  gap: 0;
  min-inline-size: 0;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--rule);
  border-radius: 0;
  padding: 10px 0 0;
  background: transparent;
}
.included-panel legend {
  padding: 0 6px 0 0;
  color: var(--muted);
  font-size: var(--text-small);
  font-weight: var(--weight-strong);
}
.included-list {
  display: grid;
  gap: 0;
}
.participant-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  min-height: 52px;
  padding: 6px 0;
}
.participant-row:first-child {
  border-top: 0;
}
.participant-split {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-height: 44px;
  margin: 0;
}
.participant-split input {
  width: 18px;
  height: 18px;
  min-height: 0;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  accent-color: var(--ledger);
}
.participant-row strong {
  min-width: 0;
  overflow-wrap: anywhere;
}
.participant-actions {
  justify-content: flex-end;
}
.participant-actions button {
  min-height: 36px;
  padding-inline: 10px;
}
.embedded-block {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--rule);
}
.embedded-block + .inline-form {
  border-top: 0;
}
.embedded-head {
  display: grid;
  gap: 2px;
}
.embedded-head p {
  margin: 0;
  font-size: var(--text-small);
}
.participant-manager {
  margin-top: 4px;
  padding: 10px 0 0;
  border-top: 1px solid var(--rule);
  border-bottom: 0;
}
.participant-manager > .inline-form {
  margin-top: 0;
}
.participant-add-row {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
}
.participant-add-row button {
  min-width: 76px;
}
.history-kind {
  display: inline-block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: var(--weight-heavy);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.empty {
  color: var(--muted);
  padding: 18px 14px;
  font-size: var(--text-small);
}
.expense-defaults {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  max-width: 100%;
  font-size: var(--text-small);
  line-height: 1.35;
}
.expense-defaults > span {
  color: var(--muted);
  font-weight: var(--weight-strong);
}
.expense-defaults select {
  width: auto;
  min-width: 136px;
  min-height: 36px;
}
.expense-defaults button {
  min-height: 36px;
}
.settlement-dock {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--rule);
  background: color-mix(in oklch, var(--amber-wash), var(--sheet) 58%);
}
.settlement-dock-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
}
.settlement-dock-head p {
  margin: 2px 0 0;
  font-size: var(--text-small);
}
.manual-settlement {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
}
.settlement-form {
  border-top: 1px solid var(--amber-rule);
  background: color-mix(in oklch, var(--sheet), var(--amber-wash) 42%);
}
.settlement-form[hidden] {
  display: none;
}
.settlement-party-row,
.settlement-action-row {
  display: grid;
  gap: 10px;
  align-items: end;
}
.settlement-party-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.settlement-action-row {
  grid-template-columns: minmax(0, 1fr) auto auto;
}
.settlement-action-row button {
  min-width: 76px;
}
.toast-region {
  position: fixed;
  z-index: 20;
  top: 14px;
  right: 14px;
  width: min(360px, calc(100vw - 28px));
  pointer-events: none;
}
.toast-message {
  margin: 0;
  border: 1px solid var(--amber-rule);
  border-radius: 8px;
  background: var(--amber-wash);
  color: var(--amber-deep);
  box-shadow: var(--shadow);
  padding: 10px 12px;
  font-size: var(--text-small);
  font-weight: var(--weight-strong);
  line-height: 1.35;
}
.start-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  border: 1px solid var(--ledger-rule);
  border-radius: 8px;
  background: var(--ledger-wash);
  padding: 12px 14px;
}
.start-panel[hidden] {
  display: none;
}
.start-panel p {
  margin: 2px 0 0;
}
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 7px;
  background: var(--wash);
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: var(--weight-strong);
  line-height: 1.35;
}
.chip-current,
.chip-success {
  background: var(--ledger-wash);
  color: var(--ledger-deep);
}
.chip-pending {
  background: var(--amber-wash);
  color: var(--amber-deep);
}
.success-note {
  border: 1px solid var(--ledger-rule);
  border-radius: 8px;
  background: var(--ledger-wash);
  color: var(--ledger-deep);
  padding: 8px 10px;
  font-size: var(--text-small);
  line-height: 1.35;
}
.refresh-note {
  margin: 0 0 var(--space-md);
  border: 1px solid var(--amber-rule);
  border-radius: 8px;
  background: var(--amber-wash);
  color: var(--amber-deep);
  padding: 10px 12px;
  font-size: var(--text-small);
  line-height: 1.35;
}
.control-note {
  color: var(--muted);
  font-size: var(--text-small);
  line-height: 1.35;
}
.draft-warning {
  margin: 0;
  color: var(--amber-deep);
}
@media (max-width: 820px) {
  .app-shell { padding: 14px; }
  .app-top, .app-grid { display: block; }
  .top-tools {
    justify-items: start;
    margin-top: var(--space-sm);
  }
  .section-head {
    flex-wrap: wrap;
  }
  .expense-defaults {
    flex: 1 1 100%;
    justify-content: stretch;
  }
  .expense-defaults > span {
    width: 100%;
  }
  .expense-defaults select {
    flex: 1 1 140px;
  }
  .manual-settlement {
    display: grid;
  }
  .manual-settlement button {
    width: 100%;
  }
  .settlement-party-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .settlement-action-row {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }
  .settlement-action-row button {
    min-width: 68px;
    padding-inline: 12px;
  }
  .toast-region {
    top: auto;
    right: 14px;
    bottom: 14px;
    left: 14px;
    width: auto;
  }
  .start-panel {
    display: grid;
    gap: var(--space-sm);
  }
  .start-panel button {
    width: 100%;
  }
  .form-grid { grid-template-columns: 1fr; }
  .app-shell .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .app-shell .expense-entry-row {
    grid-template-columns: minmax(0, 1fr) minmax(88px, 108px) auto;
  }
  .compact-form {
    grid-template-columns: minmax(0, 1fr);
  }
  .participant-add-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .record-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .row-actions {
    width: 100%;
  }
  .record-row .row-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .record-row .row-actions .amount {
    grid-column: 1 / -1;
  }
  .record-row .row-actions button {
    width: 100%;
  }
  h1 { font-size: var(--text-heading); }
}
@media (max-width: 640px), (pointer: coarse) {
  button,
  button.small {
    min-height: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`

function documentPage({ title, body }: { title: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
${body.trim()}
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
