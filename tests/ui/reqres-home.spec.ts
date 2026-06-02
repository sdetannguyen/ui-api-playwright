import { test, expect } from '../../lib/fixtures'

test('reqres.in homepage displays the hero heading', async ({ reqresHome }) => {
  await reqresHome.goto()

  await expect(reqresHome.heroHeading.primary_locator).toBeVisible()
})

test('reqres.in homepage displays the signup callout', async ({ reqresHome }) => {
  await reqresHome.goto()

  const text = await reqresHome.signupCallout.textContent()
  expect(text).toBeTruthy()
})
