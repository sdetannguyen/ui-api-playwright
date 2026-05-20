import { type Locator, type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { config } from '../../infrastructure/env.config'

export class GeeksForGeeksHomePage extends BasePage {
  readonly logo: Locator

  constructor(page: Page) {
    super(page)
    this.logo = page.getByRole('link', { name: /geeksforgeeks/i }).first()
  }

  async goto() {
    await this.page.goto(config.geeksForGeeksURL)
  }
}
