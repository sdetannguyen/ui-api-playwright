import { test, expect } from '../../lib/fixtures'

test('GET /users returns a list of users', async ({ reqresApi }) => {
  const users = await reqresApi.listUsers()

  expect(users.length).toBeGreaterThan(0)
  expect(users[0].id).toBeTruthy()
  expect(users[0].email).toBeTruthy()
})

test('GET /users/:id returns the correct user', async ({ reqresApi }) => {
  const user = await reqresApi.getUser(2)

  expect(user.id).toBe(2)
  expect(user.name).toBeTruthy()
  expect(user.email).toBeTruthy()
})

test('POST /users creates a new user and returns the created resource', async ({ reqresApi }) => {
  const user = await reqresApi.createUser('morpheus', 'leader')

  expect(user.name).toBe('morpheus')
  expect(user.job).toBe('leader')
  expect(user.id).toBeTruthy()
})

test('DELETE /users/:id returns 200', async ({ reqresApi }) => {
  const status = await reqresApi.deleteUser(2)

  expect(status).toBe(200)
})
