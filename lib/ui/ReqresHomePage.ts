import { type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { HealableLocator, healable } from '../healing'
import { config } from '../../infrastructure/env.config'

export class ReqresHomePage extends BasePage {
  readonly heroHeading: HealableLocator
  readonly heroSubheading: HealableLocator
  readonly signupCallout: HealableLocator

  constructor(page: Page) {
    super(page)
    this.heroHeading = healable(
      page.getByRole('heading', { name: /A real backend/i }),
      [
        page.getByRole('heading', { name: /backend/i }),
        page.locator('h1').first(),
      ],
    )
    this.heroSubheading = healable(
      page.getByText(/stable endpoints for QA automation/i),
      [
        page.getByText(/persistent data for your apps/i),
        page.locator('#hero p').first(),
      ],
    )
    this.signupCallout = healable(
      page.getByText(/sign up free/i),
      [page.locator('a', { hasText: /sign up/i })],
    )
  }

  async goto() {
    await this.page.goto(config.reqresURL)
  }
}
