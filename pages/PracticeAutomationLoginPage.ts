import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class PracticeAutomationLoginPage extends BasePage {

    readonly usernameField: Locator
    readonly passwordField: Locator
    readonly submitBtn: Locator
    readonly congratLocator: Locator

    constructor(page: Page) {
        super(page)
        this.usernameField = page.getByLabel('Username')
        this.passwordField = page.getByLabel('Password')
        this.submitBtn = page.getByRole('button', { name: 'Submit' })
        this.congratLocator = page.getByText('Congratulations student. You')
    }

    async goto() {
        await this.page.goto('https://practicetestautomation.com/practice-test-login/');
      }

    async login(username: string, password: string) {
        await this.usernameField.fill(username)
        await this.passwordField.fill(password)
        await this.submitBtn.click()
    }

}