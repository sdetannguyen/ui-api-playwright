import { type Locator, type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { config } from '../../infrastructure/env.config'

export class ReqresHomePage extends BasePage {
  readonly heroHeading: Locator

  constructor(page: Page) {
    super(page)
    this.heroHeading = page.getByRole('heading', { name: /A real backend/i })
  }

  async goto() {
    await this.page.goto(config.reqresURL)
  }
}
