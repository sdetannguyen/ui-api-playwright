import { test, expect } from '@playwright/test'

/**
 * Steps
 * Access https://reqres.in/
 * Select 'Single user' tab
 * Get the ui response ouput
 */
test('has title', async ({ page }) => {
  await page.goto('https://reqres.in/')

  await expect(page).toHaveTitle(/Reqres - A hosted REST-API ready to respond to your AJAX/)

  await page.getByRole("link",  { name: 'Single user', exact: true }).click()

  const output = await page.getByText('{ "data": { "id": 2, "email').textContent()

  expect(output?.toString()).toContain('janet')
})
