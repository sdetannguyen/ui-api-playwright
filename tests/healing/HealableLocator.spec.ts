import { test, expect } from '@playwright/test'
import { healable } from '../../lib/healing'

test('primary success — no fallback used', async ({ page }) => {
  await page.setContent('<button id="b">Click me</button>')
  const target = healable(page.locator('#b'), [page.locator('button')])
  await target.click()
  // No assertion beyond "did not throw".
})

test('renamed-attribute scenario — primary fails, first fallback succeeds', async ({ page }) => {
  await page.setContent('<button data-testid="not-the-right-one">Click me</button>')
  const target = healable(page.locator('[data-testid="submit"]'), [
    page.locator('button', { hasText: 'Click me' }),
  ])
  await target.click()
})

test('reordered-children scenario — primary fails, semantic fallback succeeds', async ({ page }) => {
  await page.setContent('<div><span>hello</span><h1>Welcome</h1></div>')
  // Primary expects role+name; DOM has the heading but reordered around it.
  const target = healable(page.getByRole('heading', { name: 'Greetings' }), [
    page.locator('h1').first(),
  ])
  const text = await target.textContent()
  expect(text).toBe('Welcome')
})

test('all strategies exhausted throws', async ({ page }) => {
  await page.setContent('<div>nothing useful here</div>')
  const target = healable(page.locator('#missing'), [page.locator('#also-missing')])
  await expect(target.click()).rejects.toThrow()
})
