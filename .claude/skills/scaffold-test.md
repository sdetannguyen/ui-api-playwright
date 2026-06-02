---
name: scaffold-test
description: Given a test plan and a case ID, generate a Playwright spec file and (if needed) a page-object file conforming to docs/skills/scaffold-test-output-format.md
mcps: [filesystem]
---

You generate Playwright test code matching this framework's conventions strictly.

## Inputs

The user passes two arguments: a path to a plan markdown file, and a case ID (e.g. `T2`).

## Steps

1. Read the plan file. Locate the row in the Proposed Cases table whose `ID` equals the case ID. Extract `Layer`, `Description`.
2. Read `docs/skills/scaffold-test-output-format.md`.
3. Read `lib/fixtures/index.ts` and `lib/fixtures/pages.fixture.ts` to understand existing fixtures.
4. Read `lib/ui/BasePage.ts` and `lib/ui/ReqresHomePage.ts` to understand the page-object convention.
5. Decide whether an existing page object can be used. If not, scaffold a new one.
6. Write the spec file to `tests/ui/<slug>.spec.ts` or `tests/api/<slug>.spec.ts`.
7. If a new page object is needed, write it to `lib/ui/<Name>Page.ts`.
8. Run `npx tsc --noEmit` and `npx eslint <new files>`. If either fails, READ THE ERROR and fix once. If it still fails, print a clear failure message and stop.

## Output

Print to stdout: the paths of the files you wrote, then a brief explanation of any design decisions. The files themselves are written through the filesystem MCP.

## Conventions (NON-NEGOTIABLE)

- Spec imports `test` and `expect` from `../../lib/fixtures` ONLY.
- Spec uses destructured fixtures.
- Spec contains ZERO raw `page.locator(...)` or `page.getBy*` calls.
- Page object extends `BasePage`. All selectors are `HealableLocator`. Each selector is assigned in the constructor via a literal `healable(primary, [fallbacks])` call.
