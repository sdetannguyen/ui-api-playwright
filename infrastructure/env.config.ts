export const config = {
  // baseURL is used by Playwright's request fixture for API tests
  baseURL: process.env.BASE_URL ?? 'https://jsonplaceholder.typicode.com',
  reqresURL: process.env.REQRES_URL ?? 'https://reqres.in',
  practiceAutomationURL: process.env.PRACTICE_AUTOMATION_URL ?? 'https://practicetestautomation.com',
  geeksForGeeksURL: process.env.GEEKS_URL ?? 'https://www.geeksforgeeks.org',
  isCI: !!process.env.CI,
}
