import { type Locator } from '@playwright/test'

const FALLBACK_TIMEOUT_MS = 3000

export class HealableLocator {
  constructor(
    private readonly primary: Locator,
    private readonly fallbacks: Locator[],
  ) {}

  async click(): Promise<void> {
    await this.run((l) => l.click({ timeout: FALLBACK_TIMEOUT_MS }))
  }

  async fill(value: string): Promise<void> {
    await this.run((l) => l.fill(value, { timeout: FALLBACK_TIMEOUT_MS }))
  }

  async textContent(): Promise<string | null> {
    return await this.run((l) => l.textContent({ timeout: FALLBACK_TIMEOUT_MS }))
  }

  private async run<T>(op: (locator: Locator) => Promise<T>): Promise<T> {
    try {
      return await op(this.primary)
    } catch (primaryErr) {
      for (const fb of this.fallbacks) {
        try {
          // Short timeout for each fallback so worst-case is bounded.
          return await op(fb.first()).then(undefined, (e) => {
            throw e
          })
        } catch {
          continue
        }
      }
      throw primaryErr
    }
  }
}

export function healable(primary: Locator, fallbacks: Locator[]): HealableLocator {
  return new HealableLocator(primary, fallbacks)
}
