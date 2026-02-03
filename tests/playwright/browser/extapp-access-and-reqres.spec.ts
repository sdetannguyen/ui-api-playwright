import { expect } from '@playwright/test'
import { extApps as test } from '../../../fixtures/common-fixtures'

test('Pre-access geeksforgeeks for some stuffs', async({ extApp1 }) => {
    expect(extApp1).toBe('GeeksforGeeks | A computer science portal for geeks')
})