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
    return this.addExpensePanel().locator('[data-participants] .ledger-row').filter({ hasText: displayName })
  }

  expenseRecord(description: string): Locator {
    return this.historyPanel().locator('.record-row').filter({ hasText: description })
  }

  settlementPaymentRecord(): Locator {
    return this.historyPanel().locator('.record-row').filter({ hasText: 'Settlement Payment' }).first()
  }

  async switchExpenseDefault(displayName: string): Promise<void> {
    await this.expenseDefaults().getByLabel('Expense defaults Participant').selectOption({ label: displayName })
    await this.expenseDefaults().getByRole('button', { name: 'Switch' }).click()
  }

  async includeParticipant(displayName: string): Promise<void> {
    await this.includedParticipant(displayName).check()
  }

  async excludeParticipant(displayName: string): Promise<void> {
    await this.includedParticipant(displayName).uncheck()
  }

  saveExpenseButton(): Locator {
    return this.addExpensePanel().getByRole('button', { name: 'Save' })
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
    const manualPayment = settlement.getByRole('button', { name: 'Manual Payment' })
    if (!await form.isVisible() && await manualPayment.isVisible()) {
      await manualPayment.click()
    }
    await expect(form).toBeVisible()
    if (input.sender) {
      const senderSelect = form.locator('[name="senderParticipantId"]')
      await senderSelect.selectOption(await optionValueForLabel(senderSelect, input.sender))
    }
    if (input.recipient) {
      const recipientSelect = form.locator('[name="recipientParticipantId"]')
      await recipientSelect.selectOption(await optionValueForLabel(recipientSelect, input.recipient))
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
      this.settlementPanel().getByRole('button', { name: 'Record' }).click(),
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

export async function optionValueForLabel(select: Locator, label: string): Promise<string> {
  const value = await select.evaluate((element, optionLabel) => {
    if (!(element instanceof HTMLSelectElement)) {
      throw new Error('Expected a select element')
    }
    const option = Array.from(element.options).find((candidate) => candidate.label === optionLabel)
    if (!option) {
      throw new Error(`Could not find option ${optionLabel}`)
    }
    return option.value
  }, label)
  return value
}

export async function expectMobilePanel(panel: Locator): Promise<void> {
  await panel.scrollIntoViewIfNeeded()
  await expect(panel).toBeVisible()
  const box = await requiredBox(panel)
  expect(box.width).toBeGreaterThan(300)
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
