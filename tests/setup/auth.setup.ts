import { test as setup, expect } from '@playwright/test'
import { PracticeAutomationLoginPage } from '../../lib/ui/PracticeAutomationLoginPage'
import { credentials } from '../../infrastructure/credentials'

const authFile = '.auth/user.json'

setup('authenticate', async ({ page }) => {
  const loginPage = new PracticeAutomationLoginPage(page)
  await loginPage.goto()
  await loginPage.login(credentials.practiceAutomation.username, credentials.practiceAutomation.password)
  await expect(loginPage.congratLocator).toBeVisible()
  await page.context().storageState({ path: authFile })
})
