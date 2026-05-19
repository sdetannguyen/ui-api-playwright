import { test, expect } from '../../lib/fixtures'

test('reqres.in homepage displays the hero heading', async ({ reqresHome }) => {
  await reqresHome.goto()

  await expect(reqresHome.heroHeading).toBeVisible()
})
