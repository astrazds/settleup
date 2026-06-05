import { supportedCurrencies } from '../domain'
import type { EventSummary } from '../domain'
import { shadcnStyles } from './generated-shadcn-styles'

interface CreatePageValues {
  title?: string
  currency?: string
  displayName?: string
}

interface PageAssets {
  stylesheetPath: string
  clientScriptPath: string
}

const defaultPageAssets: PageAssets = {
  stylesheetPath: '/static/styles.css',
  clientScriptPath: '/static/client.js'
}

export function renderCreatePage(error = '', values: CreatePageValues = {}, assets = defaultPageAssets): string {
  const errorField = createPageErrorField(error)
  const errorMarkup = error ? `              <p id="create-error" class="error" role="alert">${escapeHtml(error)}</p>
` : ''
  const fieldErrorMarkup = (field: keyof CreatePageValues) => {
    const message = createPageFieldErrorMessage(field)
    return `              <span id="${createPageFieldErrorId(field)}" class="field-error" data-field-error="${field}" role="alert"${errorField === field ? '' : ' hidden'}>${escapeHtml(message)}</span>`
  }
  const currencyOptions = supportedCurrencies
    .map((currency) => `                      <option value="${currency}"${values.currency === currency ? ' selected' : ''}>${currency}</option>`)
    .join('\n')
  const fieldError = (field: keyof CreatePageValues) => errorField === field
    ? ` aria-invalid="true" aria-describedby="${createPageFieldErrorId(field)}" autofocus`
    : ''

  return documentPage({
    title: 'SettleUp',
    assets,
    body: `
      <main class="create-shell">
        <section class="create-card" aria-labelledby="create-title">
          <div class="brand"><span class="mark" aria-hidden="true"><span></span><span></span></span><span>SettleUp</span></div>
          <div class="create-copy">
            <h1 id="create-title">Create a shared expense Event</h1>
            <p class="muted">Use it for a trip, dinner, or shared cost.</p>
          </div>
          <form class="form create-form" method="post" action="/events" novalidate data-create-form>
${errorMarkup}
            <div class="create-readiness" aria-live="polite" data-create-readiness>
              <span data-create-readiness-text>Three details, then your private Event Link opens.</span>
              <span class="create-readiness-meter" aria-hidden="true"><span data-create-readiness-meter></span></span>
            </div>
            <label data-create-field-row="title">
              <span class="field-label-row"><span>Event Title</span><span class="field-state" data-field-state="title">Required</span></span>
              <input type="text" name="title" required autocomplete="off" dir="auto" placeholder="Sydney weekend" value="${escapeHtml(values.title ?? '')}"${fieldError('title')}>
${fieldErrorMarkup('title')}
            </label>
            <div class="form-grid">
              <label data-create-field-row="currency">
                <span class="field-label-row"><span>Currency</span><span class="field-state" data-field-state="currency">Ready</span></span>
                <select name="currency" required${fieldError('currency')}>
${currencyOptions}
                </select>
${fieldErrorMarkup('currency')}
              </label>
              <label data-create-field-row="displayName">
                <span class="field-label-row"><span>Your name</span><span class="field-state" data-field-state="displayName">Required</span></span>
                <input type="text" name="displayName" required autocomplete="name" dir="auto" placeholder="Sarah" value="${escapeHtml(values.displayName ?? '')}"${fieldError('displayName')}>
${fieldErrorMarkup('displayName')}
              </label>
            </div>
            <div class="create-submit-row">
              <p id="create-privacy-note" class="privacy-note">Next, share the private Event Link. Anyone with the link can view and edit.</p>
              <button type="submit" data-create-submit><span data-create-submit-text>Create Event</span></button>
            </div>
          </form>
${createPageValidationScript()}
        </section>
      </main>
    `
  })
}

export function renderEventPage(event: EventSummary, assets = defaultPageAssets): string {
  return documentPage({
    title: `${event.title} - SettleUp`,
    assets,
    body: `
      <main id="app" data-token="${escapeHtml(event.token)}" class="app-shell">
        <section class="loading-panel">
          <p class="eyebrow">SettleUp</p>
          <h1>${escapeHtml(event.title)}</h1>
          <p>Loading Event...</p>
        </section>
      </main>
      <script src="${escapeHtml(assets.clientScriptPath)}" type="module"></script>
    `
  })
}

export function renderNotFoundPage(assets = defaultPageAssets): string {
  return documentPage({
    title: 'Event not found - SettleUp',
    assets,
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

const appStyles = `
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
  --shadow: 0 4px 8px color-mix(in oklch, var(--ink), transparent 88%);
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
  min-width: 320px;
}
a { color: var(--ledger-deep); }
.create-shell button,
.create-shell input,
.create-shell select {
  font: inherit;
}
.create-shell button,
.button-link {
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
.create-shell button:hover,
.button-link:hover {
  background: var(--ledger-deep);
  border-color: var(--ledger-deep);
}
.create-shell button:active,
.button-link:active {
  transform: translateY(1px);
}
.create-shell button[disabled] {
  cursor: not-allowed;
  background: var(--wash);
  border-color: var(--rule);
  color: var(--muted);
}
.create-shell button.secondary {
  background: var(--sheet);
  color: var(--ink);
  border-color: var(--rule);
}
.create-shell button.secondary:hover {
  background: var(--wash);
  border-color: color-mix(in oklch, var(--rule), var(--ink) 18%);
}
.create-shell button.danger {
  background: var(--sheet);
  color: var(--clay);
  border-color: color-mix(in oklch, var(--clay), var(--rule) 70%);
}
.create-shell button.danger:hover {
  background: var(--clay-wash);
  border-color: var(--clay-rule);
}
.create-shell button:focus-visible,
.create-shell input:focus-visible,
.create-shell select:focus-visible {
  outline: 3px solid color-mix(in oklch, var(--focus), transparent 68%);
  outline-offset: 2px;
}
.create-shell input[aria-invalid="true"],
.create-shell select[aria-invalid="true"] {
  border-color: var(--clay);
}
.create-shell input,
.create-shell select {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--sheet);
  color: var(--ink);
  min-height: 40px;
  padding: 8px 10px;
}
.create-shell input::placeholder {
  color: color-mix(in oklch, var(--ink), transparent 36%);
  opacity: 1;
}
.create-shell label {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: var(--weight-strong);
}
.create-shell label span { color: var(--muted); }
.field-error {
  color: var(--clay-deep);
  font-size: var(--text-caption);
  font-weight: var(--weight-strong);
  line-height: 1.35;
  overflow-wrap: anywhere;
}
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
  text-wrap: balance;
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
  min-height: 100svh;
  display: grid;
  align-items: center;
  justify-items: center;
  padding:
    max(var(--space-xl), env(safe-area-inset-top))
    max(var(--space-lg), env(safe-area-inset-right))
    max(var(--space-xl), env(safe-area-inset-bottom))
    max(var(--space-lg), env(safe-area-inset-left));
}
.create-card {
  display: grid;
  gap: 16px;
  width: min(460px, 100%);
  min-width: 0;
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
  text-wrap: pretty;
}
.create-form {
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--sheet);
  overflow: hidden;
  padding: 16px;
  transition: border-color 180ms ease-out, box-shadow 180ms ease-out, transform 180ms ease-out;
}
.create-form:focus-within {
  border-color: color-mix(in oklch, var(--ledger-rule), var(--rule) 38%);
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--ledger-wash), transparent 28%);
}
.create-form:has([aria-invalid="true"]) {
  border-color: var(--clay-rule);
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--clay-wash), transparent 24%);
}
.create-form[data-submitting="true"] {
  border-color: var(--ledger-rule);
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--ledger-wash), transparent 18%);
  transform: translateY(-1px);
}
.create-form input,
.create-form select,
.create-form button {
  min-height: 44px;
}
.create-form input,
.create-form select {
  font-size: 1rem;
}
.create-form button {
  width: 100%;
}
.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.field-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  border-radius: 4px;
  padding: 2px 7px;
  background: var(--wash);
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: var(--weight-heavy);
  line-height: 1.2;
}
[data-create-field-row][data-state="valid"] .field-state {
  background: var(--ledger-wash);
  color: var(--ledger-deep);
}
[data-create-field-row][data-state="invalid"] .field-state {
  background: var(--clay-wash);
  color: var(--clay-deep);
}
.create-readiness {
  display: grid;
  gap: 8px;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: color-mix(in oklch, var(--wash), var(--sheet) 48%);
  padding: 10px 12px;
  color: var(--muted);
  font-size: var(--text-small);
  font-weight: var(--weight-strong);
  line-height: 1.35;
}
.create-readiness[data-ready="true"] {
  border-color: var(--ledger-rule);
  background: var(--ledger-wash);
  color: var(--ledger-deep);
}
.create-readiness-meter {
  display: block;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in oklch, var(--rule), var(--sheet) 50%);
}
.create-readiness-meter span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: var(--ledger);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 180ms ease-out;
}
.create-submit-row {
  display: grid;
  gap: 10px;
  margin: 2px -16px -16px;
  border-top: 1px solid var(--rule);
  background: color-mix(in oklch, var(--wash), var(--sheet) 56%);
  padding: 12px 16px 16px;
}
.create-submit-row button[data-create-submit] {
  position: relative;
  overflow: hidden;
}
.create-form[data-submitting="true"] button[data-create-submit][disabled] {
  cursor: progress;
  border-color: var(--ledger-deep);
  background: var(--ledger-deep);
  color: var(--on-ledger);
}
.create-submit-row button[data-create-submit]::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-115%);
  background: linear-gradient(
    100deg,
    transparent 0%,
    color-mix(in oklch, var(--on-ledger), transparent 70%) 48%,
    transparent 100%
  );
  opacity: 0;
  pointer-events: none;
}
.create-form[data-submitting="true"] button[data-create-submit]::after {
  opacity: 1;
  animation: create-submit-sheen 900ms ease-out infinite;
}
@keyframes create-submit-sheen {
  to { transform: translateX(115%); }
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
  min-width: 0;
}
.privacy-note {
  border: 1px solid var(--amber-rule);
  border-radius: 8px;
  background: var(--amber-wash);
  margin: 0;
  color: var(--amber-deep);
  padding: 10px 12px;
  font-size: var(--text-small);
  line-height: 1.4;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}
.error {
  border: 1px solid var(--clay-rule);
  background: var(--clay-wash);
  color: var(--clay-deep);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: var(--text-small);
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-wrap: pretty;
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
.app-top > div:first-child {
  min-width: 0;
}
.app-top h1 { margin-bottom: 4px; }
.event-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.event-title-line h1 {
  margin: 0;
}
.event-title-line [data-event-title] {
  min-width: 0;
  overflow-wrap: anywhere;
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
.section-head > div {
  display: grid;
  gap: 2px;
  min-width: 0;
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
.ledger-row.row-positive { background: color-mix(in oklch, var(--ledger-wash), var(--sheet) 62%); }
.ledger-row.row-negative { background: color-mix(in oklch, var(--clay-wash), var(--sheet) 30%); }
.ledger-row.row-reviewing {
  align-items: start;
  background: var(--amber-wash);
}
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
  min-width: 0;
}
.expense-entry-row {
  grid-template-columns: minmax(0, 1fr) minmax(96px, 120px) auto;
  align-items: end;
}
.expense-entry-row button[type="submit"] {
  min-width: 76px;
}
.save-disabled-note {
  margin-top: -4px;
}
.expense-onboarding {
  display: grid;
  gap: 4px;
  border: 1px solid var(--ledger-rule);
  border-radius: 8px;
  background: color-mix(in oklch, var(--ledger-wash), var(--sheet) 45%);
  color: var(--ledger-deep);
  padding: 12px;
}
.expense-onboarding strong {
  color: var(--ink);
  font-weight: var(--weight-heavy);
}
.expense-onboarding p {
  margin: 0;
  color: var(--ledger-deep);
  font-size: var(--text-small);
  line-height: 1.35;
  text-wrap: pretty;
}
.expense-onboarding + .participant-manager {
  margin-top: 0;
  border-top: 0;
  padding-top: 0;
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
.balance-review-actions {
  align-self: center;
}
.pay-preview {
  margin: 3px 0 0;
  color: var(--amber-deep);
  font-weight: var(--weight-strong);
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
  min-height: 56px;
  padding: 8px 0;
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
.participant-summary {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.participant-summary strong {
  min-width: 0;
  overflow-wrap: anywhere;
}
.participant-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: var(--weight-strong);
  line-height: 1.35;
}
.participant-inclusion.included {
  color: var(--ledger-deep);
}
.participant-actions {
  justify-content: flex-end;
}
.participant-actions button {
  min-height: 36px;
  padding-inline: 10px;
}
.participant-confirmation {
  color: var(--clay-deep);
  font-weight: var(--weight-strong);
}
.participant-confirmation strong {
  color: inherit;
}
.participant-row-editing {
  align-items: end;
}
.participant-rename-label {
  gap: 4px;
}
.participant-correction-error {
  grid-column: 2 / -1;
  margin: 0;
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
  flex: 0 0 auto;
  color: var(--muted);
  font-size: var(--text-caption);
  font-weight: var(--weight-heavy);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.history-record {
  align-items: start;
  gap: 14px;
}
.history-main {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.history-title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}
.history-title-line h3 {
  margin: 0;
}
.record-row h3,
.record-row strong {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
}
.history-summary,
.history-detail {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-small);
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.history-summary strong {
  display: inline;
  color: var(--ink);
}
.history-detail span {
  color: var(--ink);
  font-weight: var(--weight-strong);
}
.history-side {
  display: grid;
  justify-items: end;
  gap: 8px;
}
.history-actions {
  justify-content: flex-end;
  flex-wrap: nowrap;
  opacity: 0.72;
  transition: opacity 160ms ease-out;
}
.history-record:focus-within .history-actions,
.history-record:hover .history-actions {
  opacity: 1;
}
.history-actions button {
  min-height: 36px;
  padding-inline: 10px;
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
.actor-summary {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-small);
  line-height: 1.35;
}
.actor-summary strong {
  color: var(--ink);
}
.payer-note {
  margin: 0;
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
.settlement-intent {
  margin: 0;
}
.settlement-preview {
  margin: 0;
  border: 1px solid var(--amber-rule);
  border-radius: 8px;
  background: var(--amber-wash);
  color: var(--amber-deep);
  padding: 8px 10px;
  font-size: var(--text-small);
  font-weight: var(--weight-strong);
  line-height: 1.35;
  overflow-wrap: anywhere;
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
  .create-shell {
    align-items: start;
    padding:
      max(var(--space-lg), env(safe-area-inset-top))
      max(14px, env(safe-area-inset-right))
      max(var(--space-lg), env(safe-area-inset-bottom))
      max(14px, env(safe-area-inset-left));
  }
  .create-card {
    gap: 14px;
  }
  .create-card h1 {
    max-width: 14ch;
  }
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
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .app-shell .expense-entry-row label:first-child {
    grid-column: 1 / -1;
  }
  .compact-form {
    grid-template-columns: minmax(0, 1fr);
  }
  .participant-add-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .participant-row-editing {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .participant-row-editing .participant-actions,
  .participant-correction-error {
    grid-column: 2 / -1;
  }
  .participant-row-editing .participant-actions {
    justify-content: start;
  }
  .record-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .history-side {
    justify-items: stretch;
  }
  .history-side .amount {
    justify-self: start;
  }
  .row-actions {
    width: 100%;
  }
  .history-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    opacity: 1;
  }
  .history-actions button {
    width: 100%;
  }
  h1 { font-size: var(--text-heading); }
}
@media (max-width: 640px), (pointer: coarse) {
  .create-shell button,
  .create-shell button.small,
  .create-shell input,
  .create-shell select {
    min-height: 44px;
  }
  .icon-button {
    width: 44px;
    min-height: 44px;
  }
  .balance-actions button,
  .participant-actions button,
  .history-actions button,
  .expense-defaults select,
  .expense-defaults button {
    min-height: 44px;
  }
}
@media (max-height: 560px) and (orientation: landscape) {
  .create-shell {
    align-items: start;
    padding-block: 14px;
  }
  .create-card {
    gap: 8px;
  }
  .create-card h1 {
    max-width: none;
    font-size: var(--text-heading);
    margin-bottom: 4px;
  }
  .create-copy .muted {
    line-height: 1.35;
  }
  .create-form {
    grid-template-columns: minmax(0, 1.35fr) repeat(2, minmax(96px, 1fr));
    gap: 8px 10px;
    align-items: end;
    padding: 12px;
  }
  .create-readiness {
    grid-column: 1 / -1;
  }
  .create-form .error {
    grid-column: 1 / -1;
  }
  .create-form .form-grid {
    grid-column: 2 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .create-submit-row {
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) minmax(132px, auto);
    align-items: stretch;
    margin: 0;
    border-top: 0;
    background: transparent;
    padding: 0;
  }
  .create-submit-row .privacy-note {
    align-self: stretch;
  }
  .create-submit-row button {
    width: auto;
    min-width: 132px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .create-form[data-submitting="true"] button[data-create-submit]::after {
    animation: none;
    opacity: 0;
  }
}
`

export const stylesheet = `${shadcnStyles}\n${appStyles}`

function documentPage({ title, body, assets }: { title: string; body: string; assets: PageAssets }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${escapeHtml(assets.stylesheetPath)}">
</head>
<body>
${body.trim()}
</body>
</html>`
}

function createPageErrorField(error: string): keyof CreatePageValues | '' {
  if (error.includes('Event Title')) {
    return 'title'
  }
  if (error.includes('Currency')) {
    return 'currency'
  }
  if (error.includes('Participant display name')) {
    return 'displayName'
  }
  return ''
}

function createPageFieldErrorId(field: keyof CreatePageValues): string {
  if (field === 'displayName') {
    return 'create-display-name-error'
  }
  return `create-${field}-error`
}

function createPageFieldErrorMessage(field: keyof CreatePageValues): string {
  if (field === 'title') {
    return 'Enter an Event Title.'
  }
  if (field === 'currency') {
    return 'Choose a Currency.'
  }
  return 'Enter your name.'
}

function createPageValidationScript(): string {
  return `          <script>
(() => {
  const form = document.querySelector('[data-create-form]')
  if (!(form instanceof HTMLFormElement)) return

  const fields = [
    { name: 'title', message: 'Enter an Event Title.', ready: 'Ready' },
    { name: 'currency', message: 'Choose a Currency.', ready: 'Ready' },
    { name: 'displayName', message: 'Enter your name.', ready: 'Ready' }
  ]

  const errorFor = (name) => form.querySelector('[data-field-error="' + name + '"]')
  const controlFor = (name) => form.elements.namedItem(name)
  const fieldFor = (name) => fields.find((field) => field.name === name)
  const rowFor = (name) => form.querySelector('[data-create-field-row="' + name + '"]')
  const stateFor = (name) => form.querySelector('[data-field-state="' + name + '"]')
  const readiness = form.querySelector('[data-create-readiness]')
  const readinessText = form.querySelector('[data-create-readiness-text]')
  const readinessMeter = form.querySelector('[data-create-readiness-meter]')
  const submitButton = form.querySelector('[data-create-submit]')
  const submitText = form.querySelector('[data-create-submit-text]')

  const isControl = (control) => control instanceof HTMLInputElement || control instanceof HTMLSelectElement
  const isFilled = (control) => control.value.trim().length > 0

  const setVisualState = (control, state, message) => {
    const row = rowFor(control.name)
    const fieldState = stateFor(control.name)
    if (row) {
      row.dataset.state = state
    }
    if (fieldState) {
      fieldState.textContent = message
    }
  }

  const updateReadiness = () => {
    const readyCount = fields.reduce((count, field) => {
      const control = controlFor(field.name)
      return isControl(control) && isFilled(control) ? count + 1 : count
    }, 0)
    const remaining = fields.length - readyCount
    if (readinessText) {
      readinessText.textContent = remaining === 0
        ? 'Ready to create a private Event Link.'
        : remaining === 1
          ? 'One detail left before the private Event Link opens.'
          : remaining + ' details left before the private Event Link opens.'
    }
    if (readiness) {
      readiness.dataset.ready = String(remaining === 0)
    }
    if (readinessMeter instanceof HTMLElement) {
      readinessMeter.style.transform = 'scaleX(' + readyCount / fields.length + ')'
    }
  }

  const clearField = (control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return
    const error = errorFor(control.name)
    control.removeAttribute('aria-invalid')
    control.removeAttribute('aria-describedby')
    if (error) {
      error.hidden = true
    }
    const field = fieldFor(control.name)
    setVisualState(control, 'valid', field ? field.ready : 'Ready')
    updateReadiness()
  }

  const showField = (control, message, focus) => {
    const error = errorFor(control.name)
    if (!error) return
    error.textContent = message
    error.hidden = false
    control.setAttribute('aria-invalid', 'true')
    control.setAttribute('aria-describedby', error.id)
    setVisualState(control, 'invalid', 'Needed')
    updateReadiness()
    if (focus) {
      control.focus()
    }
  }

  const updateField = (control, revealError) => {
    const field = fieldFor(control.name)
    if (!field) return true
    if (isFilled(control)) {
      clearField(control)
      return true
    }
    if (revealError || control.hasAttribute('aria-invalid')) {
      showField(control, field.message, false)
    } else {
      setVisualState(control, 'pending', 'Required')
      updateReadiness()
    }
    return false
  }

  form.addEventListener('submit', (event) => {
    for (const field of fields) {
      const control = controlFor(field.name)
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) continue
      if (!control.value.trim()) {
        event.preventDefault()
        showField(control, field.message, true)
        return
      }
      clearField(control)
    }
    form.dataset.submitting = 'true'
    form.setAttribute('aria-busy', 'true')
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true
    }
    if (submitText) {
      submitText.textContent = 'Creating Event Link'
    }
    if (readinessText) {
      readinessText.textContent = 'Creating the Event Link now.'
    }
  })

  form.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement) {
      updateField(event.target, event.target.hasAttribute('aria-invalid'))
    }
  })

  form.addEventListener('change', (event) => {
    if (event.target instanceof HTMLSelectElement) {
      updateField(event.target, event.target.hasAttribute('aria-invalid'))
    }
  })

  for (const field of fields) {
    const control = controlFor(field.name)
    if (isControl(control)) {
      updateField(control, control.hasAttribute('aria-invalid'))
    }
  }
})()
</script>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
