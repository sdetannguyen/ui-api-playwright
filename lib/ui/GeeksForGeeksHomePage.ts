import { type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { config } from '../../infrastructure/env.config'

export class GeeksForGeeksHomePage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.page.goto(config.geeksForGeeksURL)
  }
}
