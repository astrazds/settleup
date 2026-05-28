import { describe, expect, it } from 'vitest'

import { clientScript } from './client'

describe('client script contract', () => {
  it('emits parseable browser JavaScript', () => {
    expect(() => new Function(clientScript)).not.toThrow()
  })

  it('includes the Included Participants expense capture flow', () => {
    expect(clientScript).toContain('data-included-participants')
    expect(clientScript).toContain('Choose at least one Included Participant')
    expect(clientScript).toContain('data-adjust-shares')
    expect(clientScript).toContain('data-assign-remaining')
    expect(clientScript).toContain('Amount is too small to split equally across every Included Participant')
  })

  it('includes settlement focus, inline confirmation, and copy summary controls', () => {
    expect(clientScript).toContain('data-settlement-focus')
    expect(clientScript).toContain('data-confirm-suggestion')
    expect(clientScript).toContain('Record Settlement Payment')
    expect(clientScript).toContain('data-copy-summary')
    expect(clientScript).toContain('Summary copied')
  })

  it('includes stale draft warnings for realtime and polling refreshes', () => {
    expect(clientScript).toContain('Event updated while you were editing. Review before saving.')
    expect(clientScript).toContain('Event updated. Draft fields stayed unchanged.')
  })
})
