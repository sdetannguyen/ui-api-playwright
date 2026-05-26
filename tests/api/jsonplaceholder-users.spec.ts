import { test, expect } from '../../lib/fixtures'

test('GET /users returns a list of users', async ({ jsonPlaceholderApi }) => {
  const users = await jsonPlaceholderApi.listUsers()

  expect(users.length).toBeGreaterThan(0)
  expect(users[0].id).toBeTruthy()
  expect(users[0].email).toBeTruthy()
})

test('GET /users/:id returns the correct user', async ({ jsonPlaceholderApi }) => {
  const user = await jsonPlaceholderApi.getUser(2)

  expect(user.id).toBe(2)
  expect(user.name).toBeTruthy()
  expect(user.email).toBeTruthy()
})

test('POST /users creates a new user and returns the created resource', async ({ jsonPlaceholderApi }) => {
  const user = await jsonPlaceholderApi.createUser('morpheus', 'leader')

  expect(user.name).toBe('morpheus')
  expect(user.job).toBe('leader')
  expect(user.id).toBeTruthy()
})

test('DELETE /users/:id returns 200', async ({ jsonPlaceholderApi }) => {
  const status = await jsonPlaceholderApi.deleteUser(2)

  expect(status).toBe(200)
})
