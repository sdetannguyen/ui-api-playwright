import { test, expect } from '@playwright/test'

/**
 * Steps
 * Access https://reqres.in/
 * Select 'Single user' tab
 * Get the ui response body
 */
test('has title', async ({ page }) => {
  await page.goto('https://reqres.in/')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Reqres - A hosted REST-API ready to respond to your AJAX/)
})
