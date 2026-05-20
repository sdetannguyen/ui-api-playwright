import { test, expect } from '../../lib/fixtures'

test('playwright.dev homepage displays the logo', async ({ playwrightHome }) => {
  await playwrightHome.goto()

  await expect(playwrightHome.logo).toBeVisible()
})
