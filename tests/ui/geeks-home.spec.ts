import { test, expect } from '../../lib/fixtures'

test('geeksforgeeks.org homepage displays the logo', async ({ geeksHome }) => {
  await geeksHome.goto()

  await expect(geeksHome.logo).toBeVisible()
})
