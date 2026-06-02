---
name: heal-test
description: Given a failed Playwright test and a screenshot, inspect the live page DOM and emit a JSON patch document upgrading the HealableLocator strategy chain
mcps: [filesystem, playwright]
---

You repair flaky Playwright selectors. You DO NOT edit test code. You DO NOT generate unified diffs. You emit a structured JSON document.

## Inputs

Two arguments: the failed test name (matches `test(...)` body), and a path to a screenshot file from the failing run.

## Steps

1. Read `agents/skills/heal-test/output-schema.json`. Memorise its shape.
2. Read the screenshot to understand the visible UI state.
3. Use Playwright MCP to navigate to the page that the failing test targets (you may need to read the test file to learn the URL).
4. Inspect the current DOM. Identify the element the failing selector was trying to reach.
5. Read the page-object file referenced by the failing test. Locate the `healable(...)` call whose `selectorId` matches the failing locator.
6. Propose ONE OR MORE fallback selector expressions (Playwright Locator expressions) that would resolve to the correct element on the current DOM.
7. Emit a JSON document conforming to the schema. Print it to stdout, nothing else.

## Output

A single JSON object printed to stdout. Example:

{
  "file": "lib/ui/ReqresHomePage.ts",
  "selectorId": "heroHeading",
  "action": "add_fallbacks",
  "fallbacks": [
    "page.getByRole('heading', { name: /real backend/i })",
    "page.locator('h1').first()"
  ],
  "rationale": "Heading text changed from 'A real backend' to 'Real backend'. Role+name regex tolerates copy drift; tag selector tolerates role attribute removal."
}

The output MUST validate against the schema. If you cannot determine a fix, print exactly `{"error": "no_fix_proposed", "reason": "<why>"}` and stop.
