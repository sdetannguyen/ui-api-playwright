export const config = {
  jsonPlaceholderURL: process.env.JSON_PLACEHOLDER_URL ?? 'https://jsonplaceholder.typicode.com',
  reqresURL: process.env.REQRES_URL ?? 'https://reqres.in',
  practiceAutomationURL: process.env.PRACTICE_AUTOMATION_URL ?? 'https://practicetestautomation.com',
  playwrightDevURL: process.env.PLAYWRIGHT_DEV_URL ?? 'https://playwright.dev',
  isCI: !!process.env.CI,
}
