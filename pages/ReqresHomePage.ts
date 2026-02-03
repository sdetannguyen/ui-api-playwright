import {type Locator, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class ReqresHomePage extends BasePage {
    
    readonly howItWorksBtn: Locator
    readonly heading: Locator

    constructor(page: Page) {
        super(page)
        this.howItWorksBtn = page.getByRole('link', { name: 'How it works' })
        this.heading = page.getByRole('heading', { name: 'The project lifecycle' })  
    }

    async goto() {
      await this.page.goto('/');
    }

    async getResponseContent() {
      await this.howItWorksBtn.click()
      return await this.heading.textContent()
    }
}