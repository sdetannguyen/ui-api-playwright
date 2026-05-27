import { test, expect } from '@playwright/test'
import { applyPatch } from '../../agents/apply-patch'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

test('applyPatch inserts new fallback expressions into the healable() call', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-patch-'))
  const file = path.join(tmpDir, 'SamplePage.ts')
  fs.writeFileSync(
    file,
    `import { type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { HealableLocator, healable } from '../healing'

export class SamplePage extends BasePage {
  readonly hero: HealableLocator

  constructor(page: Page) {
    super(page)
    this.hero = healable(page.getByRole('heading', { name: 'Hi' }), [])
  }

  async goto() {}
}
`,
  )

  applyPatch({
    file,
    selectorId: 'hero',
    action: 'add_fallbacks',
    fallbacks: ["page.getByRole('heading', { name: /hi/i })", "page.locator('h1').first()"],
    rationale: 'test',
  })

  const updated = fs.readFileSync(file, 'utf8')
  expect(updated).toContain("page.getByRole('heading', { name: /hi/i })")
  expect(updated).toContain("page.locator('h1').first()")
})

test('applyPatch throws on selectorId not found', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-patch-'))
  const file = path.join(tmpDir, 'NoMatchPage.ts')
  fs.writeFileSync(file, `export class NoMatchPage {}`)

  expect(() =>
    applyPatch({
      file,
      selectorId: 'missing',
      action: 'add_fallbacks',
      fallbacks: ['x'],
      rationale: 't',
    }),
  ).toThrow(/selectorId.*not found/)
})
