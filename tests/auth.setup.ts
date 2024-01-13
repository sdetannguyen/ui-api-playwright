import { test as setup, expect } from '@playwright/test';
import { PracticeAutomationLoginPage } from './../pages/PracticeAutomationLoginPage'

const authFile = '.auth/user.json';
/*
/ For global setup and state storage, such as user sessions, cookies
/ Target folder to store the states: .auth/user.json
*/
setup('authenticate', async ({ page }) => {
  // Perform authentication steps. Replace these actions with your own.
  const loginPage = new PracticeAutomationLoginPage(page)
  await loginPage.goto();
  await loginPage.login('student', 'Password123')

  // Wait until the page receives the cookies.
  await expect(loginPage.congratLocator).toBeVisible()

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});