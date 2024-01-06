import { test, expect } from '@playwright/test'
z
/**
 * Steps
 * 1. Access https://reqres.in/
 * 2. Select 'Single user' tab
 * 3. Get the ui response ouput
 */
test('Verify single user session', async ({ page }) => {
  await page.goto('https://reqres.in/')

  await expect(page).toHaveTitle(/Reqres - A hosted REST-API ready to respond to your AJAX/)

  await page.getByRole("link",  { name: 'Single user', exact: true }).click()

  const output = await page.getByText('{ "data": { "id": 2, "email').textContent()

  expect(output?.toString()).toContain('janet')
})
