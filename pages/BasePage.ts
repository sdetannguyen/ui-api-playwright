import { type Page } from '@playwright/test'

export class BasePage {

    readonly page: Page

    constructor(page: Page) {
        this.page = page

        //Common locators
    }

    // Common actions
    async waitForFullPageIsLoaded() {
        // To be defined
    }
}