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
  iconPath: string
}

const defaultPageAssets: PageAssets = {
  stylesheetPath: '/static/styles.css',
  clientScriptPath: '/static/client.js',
  iconPath: '/icon.svg'
}

const createShellClassName = 'min-h-svh bg-muted/35 px-4 py-6 text-foreground sm:px-6 lg:px-8'
const createCardClassName = 'mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-xl flex-col justify-center gap-6 sm:min-h-[calc(100svh-4rem)]'
const panelClassName = 'rounded-[min(var(--radius-4xl),24px)] bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/5'
const inputClassName = 'h-9 w-full min-w-0 rounded-2xl border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20'
const labelClassName = 'grid min-w-0 gap-2 text-sm font-medium text-foreground'
const fieldLabelRowClassName = 'flex items-center justify-between gap-3'
const fieldStateClassName = 'text-xs font-medium text-muted-foreground'
const fieldErrorClassName = 'text-sm font-medium text-destructive'
const buttonClassName = 'inline-flex h-9 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-primary px-4 text-sm font-medium whitespace-nowrap text-primary-foreground transition-all outline-none hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50'
const buttonLinkClassName = `${buttonClassName} text-decoration-none no-underline`
const brandIconClassName = 'size-8 shrink-0 rounded-2xl object-contain shadow-sm ring-1 ring-border'

export function renderCreatePage(error = '', values: CreatePageValues = {}, assets = defaultPageAssets): string {
  const errorField = createPageErrorField(error)
  const errorMarkup = error ? `              <p id="create-error" class="${fieldErrorClassName} rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2" role="alert">${escapeHtml(error)}</p>
` : ''
  const fieldErrorMarkup = (field: keyof CreatePageValues) => {
    const message = createPageFieldErrorMessage(field)
    return `              <span id="${createPageFieldErrorId(field)}" class="${fieldErrorClassName}" data-field-error="${field}" role="alert"${errorField === field ? '' : ' hidden'}>${escapeHtml(message)}</span>`
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
      <main class="${createShellClassName}">
        <section class="${createCardClassName}" aria-labelledby="create-title">
          <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            ${appIconMarkup(assets)}
            <span>SettleUp</span>
          </div>
          <div class="space-y-3">
            <h1 id="create-title" class="text-3xl font-medium tracking-normal text-foreground">Create a shared expense Event</h1>
            <p class="text-base text-muted-foreground">Use it for a trip, dinner, or shared cost.</p>
          </div>
          <form class="${panelClassName} grid gap-5 border border-border" method="post" action="/events" novalidate data-create-form>
${errorMarkup}
            <div class="grid gap-2 rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground" aria-live="polite" data-create-readiness>
              <span data-create-readiness-text>Three details, then your private Event Link opens.</span>
              <span class="h-1.5 overflow-hidden rounded-full bg-background" aria-hidden="true"><span class="block h-full origin-left rounded-full bg-primary transition-transform duration-200" data-create-readiness-meter></span></span>
            </div>
            <label class="${labelClassName}" data-create-field-row="title">
              <span class="${fieldLabelRowClassName}"><span>Event Title</span><span class="${fieldStateClassName}" data-field-state="title">Required</span></span>
              <input class="${inputClassName}" type="text" name="title" required autocomplete="off" dir="auto" placeholder="Sydney weekend" value="${escapeHtml(values.title ?? '')}"${fieldError('title')}>
${fieldErrorMarkup('title')}
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="${labelClassName}" data-create-field-row="currency">
                <span class="${fieldLabelRowClassName}"><span>Currency</span><span class="${fieldStateClassName}" data-field-state="currency">Ready</span></span>
                <select class="${inputClassName}" name="currency" required${fieldError('currency')}>
${currencyOptions}
                </select>
${fieldErrorMarkup('currency')}
              </label>
              <label class="${labelClassName}" data-create-field-row="displayName">
                <span class="${fieldLabelRowClassName}"><span>Your name</span><span class="${fieldStateClassName}" data-field-state="displayName">Required</span></span>
                <input class="${inputClassName}" type="text" name="displayName" required autocomplete="name" dir="auto" placeholder="Sarah" value="${escapeHtml(values.displayName ?? '')}"${fieldError('displayName')}>
${fieldErrorMarkup('displayName')}
              </label>
            </div>
            <div class="grid gap-3 border-t pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <p id="create-privacy-note" class="text-sm text-muted-foreground">Next, share the private Event Link. Anyone with the link can view and edit.</p>
              <button class="${buttonClassName} w-full sm:w-auto" type="submit" data-create-submit><span data-create-submit-text>Create Event</span></button>
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
      <main id="app" data-token="${escapeHtml(event.token)}" class="min-h-svh bg-muted/35 px-3 py-6 text-foreground sm:px-6 lg:px-8">
        <section class="mx-auto grid min-h-[calc(100svh-3rem)] w-full max-w-xl place-items-center">
          <div class="${panelClassName} w-full space-y-3">
            <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              ${appIconMarkup(assets)}
              <span>SettleUp</span>
            </div>
            <h1 class="text-2xl font-medium text-foreground">${escapeHtml(event.title)}</h1>
            <p class="text-sm text-muted-foreground">Loading Event...</p>
          </div>
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
      <main class="${createShellClassName}">
        <section class="${createCardClassName}" aria-labelledby="missing-title">
          <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            ${appIconMarkup(assets)}
            <span>SettleUp</span>
          </div>
          <div class="${panelClassName} space-y-4">
            <p class="text-sm font-medium text-muted-foreground">Event not found</p>
            <h1 id="missing-title" class="text-2xl font-medium text-foreground">This Event Link does not work</h1>
            <p class="text-sm text-muted-foreground">The Event may not exist, or the Event Link may have been copied incorrectly.</p>
            <a class="${buttonLinkClassName}" href="/">Create a new Event</a>
          </div>
        </section>
      </main>
    `
  })
}

export const stylesheet = shadcnStyles

function documentPage({ title, body, assets }: { title: string; body: string; assets: PageAssets }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#20211d">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="${escapeHtml(assets.iconPath)}">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="${escapeHtml(assets.stylesheetPath)}">
</head>
<body>
${body.trim()}
</body>
</html>`
}

function appIconMarkup(assets: PageAssets): string {
  return `<img class="${brandIconClassName}" src="${escapeHtml(assets.iconPath)}" alt="" aria-hidden="true">`
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
      fieldState.className = state === 'invalid'
        ? 'text-xs font-medium text-destructive'
        : state === 'valid'
          ? 'text-xs font-medium text-primary'
          : 'text-xs font-medium text-muted-foreground'
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
