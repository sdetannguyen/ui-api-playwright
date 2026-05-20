import { type Locator, type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { config } from '../../infrastructure/env.config'

export class PlaywrightHomePage extends BasePage {
  readonly logo: Locator

  constructor(page: Page) {
    super(page)
    this.logo = page.locator('a.navbar__brand')
  }

  async goto() {
    await this.page.goto(config.playwrightDevURL)
  }
}
