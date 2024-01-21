import { Page } from '@playwright/test';
import { BasePage } from './BasePage';


export class GeeksForGeeksHomePage extends BasePage {

    constructor(page: Page) {
        super(page)
    }

    async goto() {
        this.page.goto('https://www.geeksforgeeks.org');
    }

}