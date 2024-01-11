import { test, expect } from '@playwright/test'
import { ReqresHomePage } from '../../../pages/ReqresHomePage'

/**
 * Steps
 * 1. Access https://reqres.in/
 * 2. Select 'Single user' tab
 * 3. Get the ui response ouput
 */
test('Verify single user session', async ({ page }) => {

  const homePage = new ReqresHomePage(page)

  await homePage.goto()

  await expect(page).toHaveTitle(/Reqres - A hosted REST-API ready to respond to your AJAX/)

  await homePage.singleUserBtn.click()

  const output = await homePage.getSingleUserResponseContent()

  expect(output?.toString()).toContain('janet')
})
