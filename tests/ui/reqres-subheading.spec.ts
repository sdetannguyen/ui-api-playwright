import { test, expect } from '../../lib/fixtures'

test('reqres.in homepage displays the hero subheading', async ({ reqresHome }) => {
  await reqresHome.goto()

  await expect(reqresHome.heroSubheading.primary_locator).toBeVisible()
})
