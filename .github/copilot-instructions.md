# Copilot / AI agent instructions — ui-api-playwright

Quick orientation for code-editing agents working in this repository.

1) Purpose
- This repository contains a Playwright-based test framework for both UI and API tests. Tests live under `tests/` and follow a Page Object Model in `pages/`.

2) Big-picture architecture
- Test runner: Playwright (configs in [playwright.config.ts](playwright.config.ts)). Base URL is set to `https://reqres.in` in config.
- Tests are split by purpose under `tests/playwright/` into `api/` and `browser/` suites.
- POM: page classes live in `pages/` and extend the shared `BasePage.ts` (examples: [ReqresHomePage.ts](pages/ReqresHomePage.ts), [PracticeAutomationLoginPage.ts](pages/PracticeAutomationLoginPage.ts)).
- Fixtures: reusable fixtures are in [fixtures/common-fixtures.ts](fixtures/common-fixtures.ts).

3) Important project-specific conventions
- Setup tests: files matching `*.setup.ts` are run by the `setup` Playwright project (see `projects` in [playwright.config.ts](playwright.config.ts)). Example: `tests/auth.setup.ts`.
- Authentication state: browser `storageState` is persisted to `.auth/user.json` and reused by the `chromium` project.
- Test file naming: use descriptive names under `tests/playwright/browser` and `tests/playwright/api`; run a single file by its filename (see Commands).
- TypeScript + ts-node: repository uses TypeScript and relies on `ts-node` for some scripts (see [package.json](package.json)).

4) Key commands (copy/paste)
- Install deps: `yarn install` (README recommends Yarn) or `npm install`.
- Install Playwright browsers: `npx playwright install --with-deps` or `npm run playwright:install`.
- Run all tests: `npx playwright test`.
- Run single test file: `npx playwright test tests/playwright/browser/ui-test-reqres-website.spec.ts` (or just the filename).
- Run the custom script: `npm run playwright` runs `ts-node ./scripts/index.ts playwright` (see [package.json](package.json)).

5) CI / pre-commit hooks
- `husky` + `lint-staged` are configured. `pre-commit` script runs eslint and Playwright tests as defined in [package.json](package.json).

6) What to inspect when editing tests or pages
- Use `BasePage.ts` as the canonical pattern for page helpers. New pages should follow existing method naming and locator patterns.
- Look at existing tests in `tests/playwright/browser/` for how fixtures and pages are wired together.

7) Integration points and external dependencies
- External APIs under test include `https://reqres.in` (baseURL) and `https://practicetestautomation.com` (examples in pages). Adjust tests if baseURL is changed.
- Secrets / tokens: repo uses Google/Twilio libs for auxiliary scripts; check [package.json](package.json) and scripts before changing authentication code.

8) Quick debugging tips for agents
- If tests fail locally, run a single test with `npx playwright test -g "your test name" -p chromium --headed` (add `--debug` or `--trace` where helpful).
- To reproduce environment mismatches, ensure `npx playwright install` was run and node modules are up-to-date.

9) Files to reference when making changes
- [package.json](package.json) — scripts and devDependencies.
- [playwright.config.ts](playwright.config.ts) — projects, baseURL, reporter, storageState.
- [fixtures/common-fixtures.ts](fixtures/common-fixtures.ts) — test fixture examples.
- [pages/BasePage.ts](pages/BasePage.ts) and other pages in `pages/`.
- Representative tests: `tests/playwright/browser/ui-test-reqres-website.spec.ts` and `tests/playwright/api/api-test-reqres-website.spec.ts`.

10) When to ask for human direction
- If you need updated CI behavior, new environment variables, or to change storage of auth state, ask before modifying `playwright.config.ts` or CI pipeline files.

---
If any of the sections above are unclear or you want more examples (e.g., exact method signatures in `BasePage.ts`), tell me which area to expand and I'll iterate.
