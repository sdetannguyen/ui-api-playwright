import { test as base } from '@playwright/test'
import { ReqresHomePage } from '../ui/ReqresHomePage'
import { PlaywrightHomePage } from '../ui/PlaywrightHomePage'
import { JsonPlaceholderApiClient } from '../api/JsonPlaceholderApiClient'
import { config } from '../../infrastructure/env.config'

type PageFixtures = {
  reqresHome: ReqresHomePage
  playwrightHome: PlaywrightHomePage
}

type ApiFixtures = {
  jsonPlaceholderApi: JsonPlaceholderApiClient
}

export const test = base.extend<PageFixtures & ApiFixtures>({
  reqresHome: async ({ page }, use) => {
    await use(new ReqresHomePage(page))
  },
  playwrightHome: async ({ page }, use) => {
    await use(new PlaywrightHomePage(page))
  },
  jsonPlaceholderApi: async ({ request }, use) => {
    await use(new JsonPlaceholderApiClient(request, config.jsonPlaceholderURL))
  },
})

export { expect } from '@playwright/test'
