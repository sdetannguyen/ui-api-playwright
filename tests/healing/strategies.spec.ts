import { test, expect } from '@playwright/test'
import { domHeuristicCandidates } from '../../lib/healing/strategies/domHeuristic'

test.describe('domHeuristicCandidates', () => {
  test('expands a getByRole locator to a regex-name variant', () => {
    const candidates = domHeuristicCandidates("page.getByRole('heading', { name: 'Welcome' })")
    expect(candidates).toContain("page.getByRole('heading', { name: /welcome/i })")
  })

  test('expands a getByText locator to a regex variant', () => {
    const candidates = domHeuristicCandidates("page.getByText('Submit')")
    expect(candidates).toContain("page.getByText(/submit/i)")
  })
})
