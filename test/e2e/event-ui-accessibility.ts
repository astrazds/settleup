import { expect, type Locator, type Page } from '@playwright/test'

export async function expectSectionWithHeading(section: Locator, heading: string): Promise<void> {
  await expect(section).toBeVisible()
  await expect(section.getByRole('heading', { name: heading })).toBeVisible()
  await expect(section).toHaveJSProperty('tagName', 'SECTION')
}

export async function expectFormControlNames(scope: Locator, names: string[]): Promise<void> {
  for (const name of names) {
    await expect(scope.getByLabel(name).first()).toBeVisible()
  }
}

export async function expectIncludedParticipantsGroup(addExpense: Locator, participants: string[]): Promise<void> {
  await expect(addExpense.locator('fieldset').filter({ hasText: 'Split between' })).toBeVisible()
  await expect(addExpense.locator('legend').filter({ hasText: 'Split between' })).toBeVisible()
  for (const participant of participants) {
    await expect(addExpense.getByRole('checkbox', { name: participant })).toBeVisible()
  }
}

export async function pressFocusedAction(action: Locator): Promise<void> {
  await action.focus()
  await expect(action).toBeFocused()
  await action.press('Enter')
}

export async function expectNamedButtons(scope: Locator, names: Array<string | RegExp>): Promise<void> {
  for (const name of names) {
    await expect(scope.getByRole('button', { name })).toBeVisible()
  }
}

export async function expectActiveElementLabel(page: Page, label: string): Promise<void> {
  await expect(page.getByLabel(label)).toBeFocused()
}
