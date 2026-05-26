import { type APIRequestContext } from '@playwright/test'

interface User {
  id: number
  name: string
  username: string
  email: string
}

interface CreateUserResponse {
  name: string
  job: string
  id: number
}

export class JsonPlaceholderApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseURL: string,
  ) {}

  async listUsers(): Promise<User[]> {
    const response = await this.request.get(`${this.baseURL}/users`)
    return response.json()
  }

  async getUser(id: number): Promise<User> {
    const response = await this.request.get(`${this.baseURL}/users/${id}`)
    return response.json()
  }

  async createUser(name: string, job: string): Promise<CreateUserResponse> {
    const response = await this.request.post(`${this.baseURL}/users`, { data: { name, job } })
    return response.json()
  }

  async deleteUser(id: number): Promise<number> {
    const response = await this.request.delete(`${this.baseURL}/users/${id}`)
    return response.status()
  }
}
