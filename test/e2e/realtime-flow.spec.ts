import { expect, type BrowserContext, type Locator, type Page, test } from '@playwright/test'

declare global {
  interface Window {
    __settleupTriggerFallbackPoll?: () => Promise<void>
  }
}

test.describe('Event realtime flow', () => {
  test('reflects saved Event changes in another browser on the same Event Link', async ({ browser, page }) => {
    const eventPath = await createEvent(page, `Realtime pair ${Date.now()}`, 'Sarah')
    await expectLiveUpdatesOn(page)

    const otherContext = await browser.newContext()
    const otherPage = await otherContext.newPage()
    try {
      await otherPage.goto(eventPath)
      await expectLiveUpdatesOn(otherPage)

      await addParticipantFromExpense(page, 'Alex')

      await expect(participantRows(otherPage)).toContainText('Alex')
      await expect(addExpensePanel(otherPage).getByRole('checkbox', { name: 'Alex' })).toBeVisible()
    } finally {
      await otherContext.close()
    }
  })

  test('preserves active drafts and shows neutral review warnings after realtime refreshes', async ({ browser, page }) => {
    const eventPath = await createEvent(page, `Realtime draft ${Date.now()}`, 'Sarah')
    await addParticipantFromExpense(page, 'Alex')
    await expectLiveUpdatesOn(page)

    const editingContext = await browser.newContext()
    const editingPage = await editingContext.newPage()
    try {
      await editingPage.goto(eventPath)
      await expectLiveUpdatesOn(editingPage)

      const editingExpense = addExpensePanel(editingPage)
      await editingExpense.getByLabel('Description').fill('Unsent dinner')
      await editingExpense.getByLabel('Amount').fill('42.50')
      await recordSettlementPanel(editingPage).getByRole('button', { name: 'Record outside payment' }).click()
      await recordSettlementPanel(editingPage).getByLabel('Amount').fill('5.00')

      await addParticipantFromExpense(page, 'Priya')

      await expect(participantRows(editingPage)).toContainText('Priya')
      await expect(editingExpense.getByLabel('Description')).toHaveValue('Unsent dinner')
      await expect(editingExpense.getByLabel('Amount')).toHaveValue('42.50')
      await expect(recordSettlementPanel(editingPage).getByLabel('Amount')).toHaveValue('5.00')
      await expect(expenseDraftWarning(editingPage)).toHaveText('Event updated while you were editing. Review before saving.')
      await expect(settlementDraftWarning(editingPage)).toHaveText('Event updated while you were editing. Review before saving.')
      await expect(expenseDraftWarning(editingPage)).not.toContainText(/Sarah|Alex|Priya|lock|presence|permission/i)
      await expect(settlementDraftWarning(editingPage)).not.toContainText(/Sarah|Alex|Priya|lock|presence|permission/i)
    } finally {
      await editingContext.close()
    }
  })

  test('scopes realtime updates to the matching Event token only', async ({ browser, page }) => {
    const firstEventPath = await createEvent(page, `Realtime isolated ${Date.now()}`, 'Sarah')
    await expectLiveUpdatesOn(page)

    const sameEventContext = await browser.newContext()
    const unrelatedContext = await browser.newContext()
    const sameEventPage = await sameEventContext.newPage()
    const unrelatedPage = await unrelatedContext.newPage()
    try {
      await sameEventPage.goto(firstEventPath)
      await expectLiveUpdatesOn(sameEventPage)

      const unrelatedTitle = `Unrelated realtime ${Date.now()}`
      await createEvent(unrelatedPage, unrelatedTitle, 'Nora')
      await expectLiveUpdatesOn(unrelatedPage)

      await addParticipantFromExpense(page, 'First Event Only')

      await expect(participantRows(sameEventPage)).toContainText('First Event Only')
      await expect(addExpensePanel(unrelatedPage)).not.toContainText('First Event Only')
      await expect(unrelatedPage.getByRole('heading', { name: unrelatedTitle })).toBeVisible()
    } finally {
      await sameEventContext.close()
      await unrelatedContext.close()
    }
  })

  test('preserves drafts during deterministic fallback polling after reconnect starts', async ({ browser, page }) => {
    const eventPath = await createEvent(page, `Realtime fallback ${Date.now()}`, 'Sarah')
    await addParticipantFromExpense(page, 'Alex')
    await expectLiveUpdatesOn(page)

    const fallbackContext = await browser.newContext()
    await installDeterministicFallbackHarness(fallbackContext)
    const fallbackPage = await fallbackContext.newPage()
    try {
      await fallbackPage.goto(eventPath)
      await expect(fallbackPage.getByText('Live updates reconnecting, polling')).toBeVisible()

      const expense = addExpensePanel(fallbackPage)
      await expense.getByLabel('Description').fill('Offline draft')
      await expense.getByLabel('Amount').fill('18.75')

      await addParticipantFromExpense(page, 'Fallback Only')

      await fallbackPage.evaluate(async () => {
        if (!window.__settleupTriggerFallbackPoll) {
          throw new Error('Fallback poll trigger was not installed')
        }
        await window.__settleupTriggerFallbackPoll()
      })

      await expect(participantRows(fallbackPage)).toContainText('Fallback Only')
      await expect(expense.getByLabel('Description')).toHaveValue('Offline draft')
      await expect(expense.getByLabel('Amount')).toHaveValue('18.75')
      await expect(expenseDraftWarning(fallbackPage)).toHaveText('Event updated while you were editing. Review before saving.')
      await expect(fallbackPage.getByText('Event data refreshed. Draft fields stayed unchanged.')).toBeVisible()
    } finally {
      await fallbackContext.close()
    }
  })
})

async function createEvent(page: Page, title: string, displayName: string): Promise<string> {
  await page.goto('/')
  await page.getByLabel('Event Title').fill(title)
  await page.getByLabel('Your name').fill(displayName)
  await page.getByRole('button', { name: 'Create Event' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  return new URL(page.url()).pathname
}

async function expectLiveUpdatesOn(page: Page): Promise<void> {
  await expect(page.getByText('Live updates on')).toBeVisible()
}

async function addParticipantFromExpense(page: Page, displayName: string): Promise<void> {
  const participantForm = participantManager(page)
  await participantForm.getByLabel('Display name').fill(displayName)
  await participantForm.getByRole('button', { name: 'Add Participant' }).click()
  await expect(addExpensePanel(page).getByRole('checkbox', { name: displayName })).toBeVisible()
}

function addExpensePanel(page: Page): Locator {
  return page.getByTestId('add-expense-panel')
}

function recordSettlementPanel(page: Page): Locator {
  return page.getByTestId('record-settlement-panel')
}

function participantManager(page: Page): Locator {
  return addExpensePanel(page).locator('[data-participant-form]')
}

function participantRows(page: Page): Locator {
  return addExpensePanel(page).locator('[data-participants]')
}

function expenseDraftWarning(page: Page): Locator {
  return addExpensePanel(page).locator('[data-expense-update-warning]')
}

function settlementDraftWarning(page: Page): Locator {
  return recordSettlementPanel(page).locator('[data-settlement-update-warning]')
}

async function installDeterministicFallbackHarness(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const fallbackPolls = new Map<number, () => Promise<void>>()
    let nextFallbackId = -1
    let nextSkippedTimeoutId = -1000
    const skippedTimeouts = new Set<number>()
    const nativeSetInterval = window.setInterval.bind(window)
    const nativeClearInterval = window.clearInterval.bind(window)
    const nativeSetTimeout = window.setTimeout.bind(window)
    const nativeClearTimeout = window.clearTimeout.bind(window)
    const NativeWebSocket = window.WebSocket

    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
      if (timeout === 8000) {
        const id = nextFallbackId
        nextFallbackId -= 1
        fallbackPolls.set(id, async () => {
          if (typeof handler === 'function') {
            await handler.apply(window, args)
            return
          }
          window.eval(handler)
        })
        return id
      }
      return nativeSetInterval(handler, timeout, ...args)
    }) as typeof window.setInterval

    window.clearInterval = ((id?: number): void => {
      if (typeof id === 'number' && fallbackPolls.delete(id)) return
      nativeClearInterval(id)
    }) as typeof window.clearInterval

    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
      if (timeout === 1000) {
        const id = nextSkippedTimeoutId
        nextSkippedTimeoutId -= 1
        skippedTimeouts.add(id)
        return id
      }
      return nativeSetTimeout(handler, timeout, ...args)
    }) as typeof window.setTimeout

    window.clearTimeout = ((id?: number): void => {
      if (typeof id === 'number' && skippedTimeouts.delete(id)) return
      nativeClearTimeout(id)
    }) as typeof window.clearTimeout

    const ClosingWebSocket = function(url: string | URL, protocols?: string | string[]): WebSocket {
      const socket = protocols === undefined
        ? new NativeWebSocket(url)
        : new NativeWebSocket(url, protocols)
      socket.addEventListener('open', () => {
        nativeSetTimeout(() => {
          socket.dispatchEvent(new CloseEvent('close', {
            code: 1006,
            reason: 'Test fallback reconnect',
            wasClean: false
          }))
          socket.close(1000, 'Test fallback reconnect')
        }, 0)
      }, { once: true })
      return socket
    } as unknown as typeof WebSocket

    Object.defineProperties(ClosingWebSocket, {
      CONNECTING: { value: NativeWebSocket.CONNECTING },
      OPEN: { value: NativeWebSocket.OPEN },
      CLOSING: { value: NativeWebSocket.CLOSING },
      CLOSED: { value: NativeWebSocket.CLOSED },
      prototype: { value: NativeWebSocket.prototype }
    })
    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      writable: true,
      value: ClosingWebSocket
    })
    window.__settleupTriggerFallbackPoll = async () => {
      const poll = Array.from(fallbackPolls.values()).at(-1)
      if (!poll) {
        throw new Error('No fallback poll is active')
      }
      await poll()
    }
  })
}
