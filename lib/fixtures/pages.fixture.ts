import { test as base } from '@playwright/test'
import { ReqresHomePage } from '../ui/ReqresHomePage'
import { GeeksForGeeksHomePage } from '../ui/GeeksForGeeksHomePage'
import { ReqresApiClient } from '../api/ReqresApiClient'

type PageFixtures = {
  reqresHome: ReqresHomePage
  geeksHome: GeeksForGeeksHomePage
}

type ApiFixtures = {
  reqresApi: ReqresApiClient
}

export const test = base.extend<PageFixtures & ApiFixtures>({
  reqresHome: async ({ page }, use) => {
    await use(new ReqresHomePage(page))
  },
  geeksHome: async ({ page }, use) => {
    await use(new GeeksForGeeksHomePage(page))
  },
  reqresApi: async ({ request }, use) => {
    await use(new ReqresApiClient(request))
  },
})

export { expect } from '@playwright/test'
