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

export interface ShareExpectation {
  participant: string
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

  firstSuggestedSettlement(): Locator {
    return this.settlementPanel().locator('.suggestion').first()
  }

  async selectPayer(displayName: string): Promise<void> {
    await this.addExpensePanel().getByLabel('Payer').selectOption({ label: displayName })
  }

  async includeParticipant(displayName: string): Promise<void> {
    await this.includedParticipant(displayName).check()
  }

  async excludeParticipant(displayName: string): Promise<void> {
    await this.includedParticipant(displayName).uncheck()
  }

  saveExpenseButton(): Locator {
    return this.addExpensePanel().getByRole('button', { name: 'Save Expense' })
  }

  async saveExpense(): Promise<void> {
    await this.saveExpenseButton().click()
  }

  async adjustShares(): Promise<void> {
    await this.addExpensePanel().getByRole('button', { name: 'Adjust Shares' }).click()
    await expect(this.addExpensePanel().getByText('Remaining', { exact: true })).toBeVisible()
  }

  async fillShare(participant: string, amount: string): Promise<void> {
    const row = await this.shareRowForParticipant(participant)
    await row.getByLabel('Share').fill(amount)
  }

  async assignRemainingTo(participant: string): Promise<void> {
    const addExpense = this.addExpensePanel()
    await addExpense.getByLabel('Assign remaining to').selectOption({ label: participant })
    await addExpense.getByRole('button', { name: 'Assign remaining' }).click()
  }

  async expectShares(expectedRows: ShareExpectation[]): Promise<void> {
    const addExpense = this.addExpensePanel()
    const rows = addExpense.locator('.share-row')
    await expect(rows).toHaveCount(expectedRows.length)
    for (const { participant, amount } of expectedRows) {
      const row = await this.shareRowForParticipant(participant)
      await expect(row.getByLabel('Share')).toHaveValue(amount)
    }
  }

  async startSettlementFocus(): Promise<void> {
    await this.settlementPanel().getByRole('button', { name: 'Settle up' }).click()
  }

  async copySettlementSummary(): Promise<void> {
    await this.settlementPanel().getByRole('button', { name: 'Copy summary' }).click()
  }

  async draftSettlementPayment(input: SettlementPaymentDraftInput): Promise<void> {
    const settlement = this.settlementPanel()
    if (input.sender) {
      await settlement.getByLabel('Sender').selectOption({ label: input.sender })
    }
    if (input.recipient) {
      await settlement.getByLabel('Recipient').selectOption({ label: input.recipient })
    }
    if (input.amount) {
      await settlement.getByLabel('Amount').fill(input.amount)
    }
  }

  async saveSettlementPayment(): Promise<void> {
    await this.settlementPanel().getByRole('button', { name: 'Record Settlement Payment' }).click()
  }

  async recordFirstSuggestedSettlement(): Promise<{ sender: string }> {
    const suggestion = this.firstSuggestedSettlement()
    const suggestionText = await suggestion.textContent()
    const sender = participantBefore(suggestionText, ' sends ')
    await suggestion.getByRole('button', { name: 'Record' }).click()
    await suggestion.getByRole('button', { name: 'Record Settlement Payment' }).click()
    return { sender }
  }

  async shareRowForParticipant(participant: string): Promise<Locator> {
    const rows = this.addExpensePanel().locator('.share-row')
    const count = await rows.count()
    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index)
      const value = await row.getByLabel('Participant').inputValue()
      const expectedValue = await optionValueForLabel(row.getByLabel('Participant'), participant)
      if (value === expectedValue) {
        return row
      }
    }
    throw new Error(`Could not find Share row for ${participant}`)
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

export function participantBefore(value: string | null, marker: string): string {
  const text = value || ''
  const index = text.indexOf(marker)
  if (index === -1) {
    throw new Error(`Could not find participant before ${marker}`)
  }
  return text.slice(0, index).trim()
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
