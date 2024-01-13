import { type Page } from '@playwright/test'

export abstract class BasePage {

    readonly page: Page

    constructor(page: Page) {
        this.page = page

        //Common locators
    }

    abstract goto(): void

    // Common actions
    async waitForFullPageIsLoaded() {
        // To be defined
    }
}