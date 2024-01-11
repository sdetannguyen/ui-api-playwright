import {type Locator, type Page } from '@playwright/test'

export class ReqresHomePage {
    
    readonly page: Page
    readonly singleUserBtn: Locator
    readonly pomLink: Locator
    readonly singleUserRespone: Locator

    constructor(page: Page) {
        this.page = page
        this.singleUserBtn = page.getByRole("link",  { name: 'Single user', exact: true })
        this.singleUserRespone = page.getByText('{ "data": { "id": 2, "email')  
    }

    async goto() {
      await this.page.goto('/');
    }

    async getSingleUserResponseContent() {
      await this.singleUserBtn.click()
      return await this.singleUserRespone.textContent()
    }
}