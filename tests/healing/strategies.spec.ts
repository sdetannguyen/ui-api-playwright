import { test, expect } from '@playwright/test'
import { domHeuristicCandidates } from '../../lib/healing/strategies/domHeuristic'
import { semanticCandidates } from '../../lib/healing/strategies/semantic'

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

test.describe('semanticCandidates', () => {
  test('falls back to first-of-tag for h-tagged headings', () => {
    const candidates = semanticCandidates("page.getByRole('heading', { name: 'Welcome' })")
    expect(candidates).toContain("page.locator('h1, h2, h3').first()")
  })

  test('falls back to text-substring for buttons', () => {
    const candidates = semanticCandidates("page.getByRole('button', { name: 'Sign up' })")
    expect(candidates).toContain("page.locator('button', { hasText: /sign|up/i })")
  })
})
