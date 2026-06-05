import { expect, type Locator, type Page } from '@playwright/test'

export interface CreateEventInput {
  eventTitle: string
  currency?: string
  firstParticipant?: string
}

export interface ExpenseDraftInput {
  description: string
  amount: string
}

export interface SettlementPaymentDraftInput {
  sender?: string
  recipient?: string
  amount?: string
}

export class EventUi {
  constructor(readonly page: Page) {}

  balancesPanel(): Locator {
    return this.page.getByTestId('balances-panel')
  }

  addExpensePanel(): Locator {
    return this.page.getByTestId('add-expense-panel')
  }

  settlementPanel(): Locator {
    return this.page.getByTestId('record-settlement-panel')
  }

  historyPanel(): Locator {
    return this.page.getByTestId('event-history-panel')
  }

  expenseDefaults(): Locator {
    return this.page.getByTestId('expense-defaults')
  }

  async createEvent(input: CreateEventInput): Promise<void> {
    await this.page.goto('/')
    await this.page.getByLabel('Event Title').fill(input.eventTitle)
    if (input.currency) {
      await this.page.getByLabel('Currency').selectOption(input.currency)
    }
    await this.page.getByLabel('Your name').fill(input.firstParticipant ?? 'Sarah')
    await this.page.getByRole('button', { name: 'Create Event' }).click()
    await expect(this.page.getByRole('heading', { name: input.eventTitle })).toBeVisible()
  }

  async draftExpense(input: ExpenseDraftInput): Promise<void> {
    const addExpense = this.addExpensePanel()
    await addExpense.getByLabel('Description').fill(input.description)
    await addExpense.getByLabel('Amount').fill(input.amount)
  }

  async addParticipant(displayName: string): Promise<void> {
    const addExpense = this.addExpensePanel()
    await this.openParticipantManager()
    await addExpense.getByLabel('Display name').fill(displayName)
    await addExpense.getByRole('button', { name: 'Add Participant' }).click()
    await expect(this.includedParticipant(displayName)).toBeVisible()
  }

  async addParticipants(displayNames: string[]): Promise<void> {
    for (const displayName of displayNames) {
      await this.addParticipant(displayName)
    }
  }

  includedParticipant(displayName: string): Locator {
    return this.addExpensePanel().getByRole('checkbox', { name: displayName })
  }

  participantRow(displayName: string): Locator {
    return this.addExpensePanel().locator('[data-participants]').getByTestId('participant-row').filter({ hasText: displayName })
  }

  expenseRecord(description: string): Locator {
    return this.historyPanel().getByTestId('history-record').filter({ hasText: description })
  }

  settlementPaymentRecord(): Locator {
    return this.historyPanel().getByTestId('history-record').filter({ hasText: 'Recorded payment outside SettleUp' }).first()
  }

  async switchExpenseDefault(displayName: string): Promise<void> {
    await chooseComboboxOption(
      this.page,
      this.expenseDefaults().getByRole('combobox', { name: 'Choose who is adding expenses' }),
      displayName
    )
  }

  async includeParticipant(displayName: string): Promise<void> {
    await this.includedParticipant(displayName).check()
  }

  async excludeParticipant(displayName: string): Promise<void> {
    await this.includedParticipant(displayName).uncheck()
  }

  saveExpenseButton(): Locator {
    return this.addExpensePanel().getByRole('button', { name: 'Save expense' })
  }

  async saveExpense(): Promise<void> {
    const responsePromise = this.page.waitForResponse((response) => {
      const request = response.request()
      return response.url().includes('/expenses') &&
        (request.method() === 'POST' || request.method() === 'PATCH')
    })
    const [, response] = await Promise.all([
      this.saveExpenseButton().click(),
      responsePromise
    ])
    expect(response.ok()).toBe(true)
  }

  async draftSettlementPayment(input: SettlementPaymentDraftInput): Promise<void> {
    const settlement = this.settlementPanel()
    const form = settlement.locator('[data-settlement-form]')
    const manualPayment = settlement.getByRole('button', { name: 'Record outside payment' })
    if (!await form.isVisible() && await manualPayment.isVisible()) {
      await manualPayment.click()
    }
    await expect(form).toBeVisible()
    if (input.sender) {
      await chooseComboboxOption(this.page, form.getByRole('combobox', { name: 'Who paid' }), input.sender)
    }
    if (input.recipient) {
      await chooseComboboxOption(this.page, form.getByRole('combobox', { name: 'Who received' }), input.recipient)
    }
    if (input.amount) {
      await form.locator('[name="amount"]').fill(input.amount)
    }
  }

  async saveSettlementPayment(): Promise<void> {
    const responsePromise = this.page.waitForResponse((response) => {
      const request = response.request()
      return response.url().includes('/settlement-payments') &&
        (request.method() === 'POST' || request.method() === 'PATCH')
    })
    const [, response] = await Promise.all([
      this.settlementPanel().locator('[data-settlement-form]').getByRole('button', { name: /Record payment|Save payment/ }).click(),
      responsePromise
    ])
    expect(response.ok()).toBe(true)
  }

  async openParticipantManager(): Promise<void> {
    await expect(this.addExpensePanel().locator('[data-participant-form]')).toBeVisible()
  }

}

export function eventUi(page: Page): EventUi {
  return new EventUi(page)
}

async function chooseComboboxOption(page: Page, combobox: Locator, label: string): Promise<void> {
  await combobox.click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

export async function expectMobilePanel(panel: Locator): Promise<void> {
  await panel.scrollIntoViewIfNeeded()
  await expect(panel).toBeVisible()
  const box = await requiredBox(panel)
  const viewportWidth = await panel.evaluate(() => document.documentElement.clientWidth)
  expect(box.width).toBeGreaterThanOrEqual(Math.min(260, viewportWidth - 56))
  expect(box.width).toBeLessThanOrEqual(390)
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

export async function requiredBox(locator: Locator): Promise<{ x: number, y: number, width: number, height: number }> {
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error('Expected element to have a layout box')
  }
  return box
}
