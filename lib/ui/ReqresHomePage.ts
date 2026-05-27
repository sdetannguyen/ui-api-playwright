import { type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { HealableLocator, healable } from '../healing'
import { config } from '../../infrastructure/env.config'

export class ReqresHomePage extends BasePage {
  readonly heroHeading: HealableLocator
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
    this.signupCallout = healable(
      page.getByText(/sign up free/i),
      [page.locator('a', { hasText: /sign up/i })],
    )
  }

  async goto() {
    await this.page.goto(config.reqresURL)
  }
}
