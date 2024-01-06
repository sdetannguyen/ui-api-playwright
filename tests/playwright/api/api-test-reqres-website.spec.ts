import { test, expect } from '@playwright/test'
zz
/**
 * Steps
 * 1. Call to https://reqres.in/api/users
 * 2. Verify email in response body
 */
test('Get list of users', async( { request } ) => {
    const response = await request.get(`/api/users`)
    expect(await response.text()).toContain('janet.weaver@reqres.in')
})