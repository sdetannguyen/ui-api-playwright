import { test as base } from '@playwright/test'
import { ReqresHomePage } from '../ui/ReqresHomePage'
import { PlaywrightHomePage } from '../ui/PlaywrightHomePage'
import { ReqresApiClient } from '../api/ReqresApiClient'

type PageFixtures = {
  reqresHome: ReqresHomePage
  playwrightHome: PlaywrightHomePage
}

type ApiFixtures = {
  reqresApi: ReqresApiClient
}

export const test = base.extend<PageFixtures & ApiFixtures>({
  reqresHome: async ({ page }, use) => {
    await use(new ReqresHomePage(page))
  },
  playwrightHome: async ({ page }, use) => {
    await use(new PlaywrightHomePage(page))
  },
  reqresApi: async ({ request }, use) => {
    await use(new ReqresApiClient(request))
  },
})

export { expect } from '@playwright/test'
