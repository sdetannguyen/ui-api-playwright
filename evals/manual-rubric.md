# Manual eval rubric (v0)

When run-cli cannot run a skill (scaffold-test, heal-test), evaluate the Claude Code output by hand. Record yes/no per checklist item; only an all-yes row counts as `pass`.

## scaffold-test

- [ ] Spec file imports `test`/`expect` from `../../lib/fixtures` only
- [ ] Spec file contains zero `page.locator(...)` / `page.getBy*(...)` calls
- [ ] Spec file uses destructured fixture parameter
- [ ] Page object (if new) extends `BasePage`
- [ ] Page object uses `healable(primary, [fallbacks])` for every selector
- [ ] `npx tsc --noEmit` passes
- [ ] `npx eslint <new files>` passes
- [ ] Generated test runs and passes (or fails for a legitimate reason)

## heal-test

- [ ] JSON output validates against `agents/skills/heal-test/output-schema.json`
- [ ] `file` field points to a real `lib/ui/*.ts` file
- [ ] `selectorId` matches a property on the named page object
- [ ] Each entry in `fallbacks` is a syntactically valid Playwright Locator expression
- [ ] After `npm run apply-patch`, `git diff` shows only the expected additions
- [ ] After applying, the previously failing test passes
