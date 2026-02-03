import { test as base } from '@playwright/test'
import { GeeksForGeeksHomePage } from '../pages/GeeksForGeeksHomePage'

interface ExternalAppFixtures {
    extApp1: string // The string type is for example, it should be an object type (pages, external app objects) instead
    extApp2: GeeksForGeeksHomePage
}

export const extApps = base.extend<ExternalAppFixtures>( {
    extApp1: async ({ page }, use ) => {

        //Access external app, get stuff
        await page.goto('https://www.geeksforgeeks.org')
        const title = await page.title()

        // Use the fixture value in the test
        await use(title)
    },

    extApp2: async({ page }, use ) => {
        const geeks = new GeeksForGeeksHomePage(page)
        await use(geeks)
    }
} )