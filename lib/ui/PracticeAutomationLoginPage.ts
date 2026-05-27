import { type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { HealableLocator, healable } from '../healing'
import { config } from '../../infrastructure/env.config'

export class PracticeAutomationLoginPage extends BasePage {
  readonly usernameField: HealableLocator
  readonly passwordField: HealableLocator
  readonly submitBtn: HealableLocator
  readonly congratLocator: HealableLocator

  constructor(page: Page) {
    super(page)
    this.usernameField = healable(
      page.getByLabel('Username'),
      [page.locator('input[name="username"]'), page.locator('input[type="text"]').first()],
    )
    this.passwordField = healable(
      page.getByLabel('Password'),
      [page.locator('input[name="password"]'), page.locator('input[type="password"]').first()],
    )
    this.submitBtn = healable(
      page.getByRole('button', { name: 'Submit' }),
      [page.locator('button[type="submit"]'), page.locator('input[type="submit"]')],
    )
    this.congratLocator = healable(
      page.getByText('Congratulations student. You'),
      [page.getByText(/congratulations/i)],
    )
  }

  async goto() {
    await this.page.goto(`${config.practiceAutomationURL}/practice-test-login/`)
  }

  async login(username: string, password: string) {
    await this.usernameField.fill(username)
    await this.passwordField.fill(password)
    await this.submitBtn.click()
  }
}
