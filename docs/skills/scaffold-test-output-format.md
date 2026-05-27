# scaffold-test output format

scaffold-test writes one or two files into the repo. It MUST conform to:

## Spec file (`tests/ui/*.spec.ts` or `tests/api/*.spec.ts`)

- Imports `test` and `expect` from `../../lib/fixtures` ONLY. Never `@playwright/test` directly.
- Calls a page object via destructured fixture (e.g. `async ({ reqresHome }) => ...`).
- Contains zero raw calls to `page.locator(...)`, `page.getByRole(...)`, `page.getByLabel(...)`, etc. All selector access goes through the page object's named `HealableLocator` property.

## Page object file (`lib/ui/*.ts`, only if a new one is needed)

- `extends BasePage`.
- All selector properties are typed `HealableLocator`.
- Each selector property is assigned in the constructor with a literal `healable(primary, [fallback1, fallback2, ...])` expression. No dynamic property names, no conditional assignment.

This constructor-literal convention is required by `agents/apply-patch.ts` to locate selectors via ts-morph.
