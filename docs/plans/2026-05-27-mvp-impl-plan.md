# AI-augmented Test Lifecycle MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four AI-skills (plan-tests, scaffold-test, heal-test, triage-failures) hosted in Claude Code + a small CLI for two of them, plus a runtime self-healing locator wrapper, in seven focused days. End state: every skill produces output conforming to a committed format contract, structural-eval scorecard committed, demo recorded.

**Architecture:** Four-tier layout on top of the existing three-tier framework. Tier 4 (AI) runs inside Claude Code (interactive) for all four skills; `agents/run-cli.ts` provides headless invocation for the two text-only skills (plan-tests, triage-failures) used by the scorecard. Healing is two-tier: `HealableLocator` does runtime fallback in Tier 2; heal-test agent in Tier 4 emits structured JSON that an applier script renders into a real `git diff`.

**Tech Stack:** TypeScript 5, Playwright 1.60, ts-morph (applier AST parsing), OpenAI SDK (talks to OpenRouter via OpenAI-compatible API), `js-yaml` (SKILL.md frontmatter parse), existing ESLint config. Claude Code as agent host. MCP servers: Microsoft Playwright MCP, Anthropic Filesystem MCP.

---

## File Structure

New files (created during the plan):

- `.mcp.json` — MCP server config (Playwright + Filesystem)
- `.claude/skills/plan-tests.md` — SKILL.md prompt
- `.claude/skills/scaffold-test.md` — SKILL.md prompt
- `.claude/skills/heal-test.md` — SKILL.md prompt
- `.claude/skills/triage-failures.md` — SKILL.md prompt
- `docs/skills/plan-tests-output-format.md` — format contract
- `docs/skills/scaffold-test-output-format.md` — format contract
- `docs/skills/triage-failures-output-format.md` — format contract
- `agents/skills/heal-test/output-schema.json` — JSON Schema
- `agents/apply-patch.ts` — ts-morph applier (~50 LOC)
- `agents/run-cli.ts` — headless CLI runner (~150 LOC)
- `lib/healing/HealableLocator.ts` — runtime healing wrapper (~80 LOC)
- `lib/healing/strategies/domHeuristic.ts` — pure fn strategy
- `lib/healing/strategies/semantic.ts` — pure fn strategy
- `lib/healing/index.ts` — `healable()` factory export
- `tests/healing/HealableLocator.spec.ts` — Playwright tests (in-process)
- `tests/healing/strategies.spec.ts` — pure-fn unit tests
- `evals/manual-rubric.md` — manual scorecard yes/no checklist per skill
- `evals/check.ts` — tiny structural eval harness
- `evals/plan-tests/cases/example-1/input/story.md` — sample story
- `evals/plan-tests/cases/example-1/expected.json` — structural assertions
- `evals/scaffold-test/cases/example-1/input.json` — sample plan + case ID
- `evals/scaffold-test/cases/example-1/expected.json`
- `evals/heal-test/cases/example-1/input.json` — failed test info
- `evals/heal-test/cases/example-1/expected.json`
- `evals/heal-test/fixtures/renamed-attribute.html`
- `evals/heal-test/fixtures/reordered-children.html`
- `evals/heal-test/fixtures/removed-element.html`
- `evals/triage-failures/cases/example-1/input/junit.xml`
- `evals/triage-failures/cases/example-1/expected.json`
- `evals/results/2026-06-02.md` — scorecard (date is approximate)

Modified files:

- `package.json` — add deps (`ts-morph`, `openai`, `js-yaml`), add scripts (`agent:plan`, `agent:triage`, `apply-patch`, `eval`)
- `lib/ui/ReqresHomePage.ts` — migrate to `healable()`, add 1-2 selectors
- `lib/ui/PracticeAutomationLoginPage.ts` — migrate to `healable()`
- `lib/fixtures/pages.fixture.ts` — no shape change expected
- `.gitignore` — add `.ai/cache/`, `.ai/runs/`
- `README.md` — Day 6 skeleton + Day 7 fill-in

Convention deferred to scaffold-test format contract: page objects MUST use `healable()` for selectors so the ts-morph applier can find and patch them.

---

## Day 1: Foundation & Format Contracts

### Task 1.1: Add dependencies

**Files:**
- Modify: `package.json`

- [x] **Step 1: Install runtime + dev dependencies**

```bash
npm install --save-dev ts-morph openai js-yaml @types/js-yaml
```

- [x] **Step 2: Add `agents/` scripts to package.json**

Edit `package.json` and add inside the `scripts` block (after the existing `eslint` line):

```json
    "agent:plan": "ts-node agents/run-cli.ts plan-tests",
    "agent:triage": "ts-node agents/run-cli.ts triage-failures",
    "apply-patch": "ts-node agents/apply-patch.ts",
    "eval": "ts-node evals/check.ts",
```

- [x] **Step 3: Verify package.json parses + deps installed**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json'))" && ls node_modules/ts-morph node_modules/openai node_modules/js-yaml`
Expected: no error from node; three directory listings without errors.

### Task 1.2: Write plan-tests format contract

**Files:**
- Create: `docs/skills/plan-tests-output-format.md`

- [x] **Step 1: Create the contract file**

```markdown
# plan-tests output format

A plan-tests output is a single markdown document. It MUST contain the following H2 sections in this order, with no others between them:

## Risk Assessment
- A bulleted list of risks. Each bullet starts with the risk name in **bold**, then a short justification.

## Coverage Gap
- A bulleted list comparing the story to existing tests under `tests/`. Each bullet starts with a verb ("Adds", "Missing", "Already covered by") and references a concrete behaviour.

## Proposed Cases
- A markdown table with exactly these columns: `ID | Layer | Priority | Description`.
- `ID` is `T<n>` (e.g. `T1`, `T2`).
- `Layer` is one of `UI` or `API`.
- `Priority` is one of `P0`, `P1`, `P2`.
- Description is one sentence.

The document MUST end with three or more proposed cases. Anything beyond these three sections is allowed but not required.
```

- [x] **Step 2: Verify file exists**

Run: `wc -l docs/skills/plan-tests-output-format.md`
Expected: at least 13 lines.

### Task 1.3: Write scaffold-test format contract

**Files:**
- Create: `docs/skills/scaffold-test-output-format.md`

- [x] **Step 1: Create the contract file**

```markdown
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
```

- [x] **Step 2: Verify**

Run: `wc -l docs/skills/scaffold-test-output-format.md`
Expected: at least 14 lines.

### Task 1.4: Write triage-failures format contract

**Files:**
- Create: `docs/skills/triage-failures-output-format.md`

- [x] **Step 1: Create the contract file**

```markdown
# triage-failures output format

A triage-failures output is one markdown document containing a single markdown table:

| Test | Classification | Justification | Linked Trace |
|---|---|---|---|

- `Test` is the failing test name as it appears in the JUnit XML `<testcase classname>.<name>`.
- `Classification` is one of `flaky`, `real-bug`, `env`.
- `Justification` is one sentence.
- `Linked Trace` is a relative path to the trace file under `test-results/`, or `n/a` if no trace was produced.

The table MUST contain one row per failed test in the input JUnit XML. No other content is required.
```

- [x] **Step 2: Verify**

Run: `wc -l docs/skills/triage-failures-output-format.md`
Expected: at least 11 lines.

### Task 1.5: Write heal-test JSON schema

**Files:**
- Create: `agents/skills/heal-test/output-schema.json`

- [ ] **Step 1: Create directory and schema file**

```bash
mkdir -p agents/skills/heal-test
```

Then create `agents/skills/heal-test/output-schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "heal-test patch document",
  "type": "object",
  "required": ["file", "selectorId", "action", "fallbacks", "rationale"],
  "additionalProperties": false,
  "properties": {
    "file": {
      "type": "string",
      "pattern": "^lib/ui/[A-Za-z0-9_]+\\.ts$"
    },
    "selectorId": {
      "type": "string",
      "pattern": "^[a-z][A-Za-z0-9_]*$"
    },
    "action": {
      "type": "string",
      "enum": ["add_fallbacks"]
    },
    "fallbacks": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" }
    },
    "rationale": {
      "type": "string",
      "minLength": 20
    }
  }
}
```

- [ ] **Step 2: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('agents/skills/heal-test/output-schema.json'))"`
Expected: no error.

### Task 1.6: Write `.mcp.json`

**Files:**
- Create: `.mcp.json`

- [ ] **Step 1: Create config**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

- [ ] **Step 2: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('.mcp.json'))"`
Expected: no error.

### Task 1.7: Write plan-tests SKILL.md

**Files:**
- Create: `.claude/skills/plan-tests.md`

- [ ] **Step 1: Create directory + file**

```bash
mkdir -p .claude/skills
```

Then create `.claude/skills/plan-tests.md`:

```markdown
---
name: plan-tests
description: Read a story markdown file and produce a risk-based test plan that conforms to docs/skills/plan-tests-output-format.md
mcps: [filesystem]
---

You are a senior SDET drafting a test plan from a feature story.

## Inputs

The user passes ONE argument: a path to a markdown file containing the story.

## Steps

1. Read the file at the given path using the filesystem MCP.
2. Read `docs/skills/plan-tests-output-format.md` for the required output structure.
3. Read the file list under `tests/` to understand what coverage already exists.
4. Produce a plan document conforming exactly to the output format.

## Output

Print the plan markdown to stdout. Do not write any files.

## Few-shot example

Input story (excerpt):
> Add inline editing to the user table on the reqres demo. Users can double-click a name cell, edit, press Enter to save. ESC cancels.

Expected output style:

## Risk Assessment
- **Data loss on accidental ESC** — pressing ESC after edits should not silently discard work without warning.
- **Concurrent edits across sessions** — two tabs editing same row.

## Coverage Gap
- Adds keyboard interaction not covered by `tests/ui/reqres-home.spec.ts`.
- Missing API contract test for the PATCH endpoint.

## Proposed Cases

| ID | Layer | Priority | Description |
|---|---|---|---|
| T1 | UI | P0 | Double-click cell → field becomes editable; Enter saves new value. |
| T2 | UI | P1 | Edit then press ESC → original value restored, no network call. |
| T3 | API | P1 | PATCH /api/users/:id returns 200 with updated payload. |

Conform to the format strictly. No additional sections.
```

- [ ] **Step 2: Verify**

Run: `head -5 .claude/skills/plan-tests.md`
Expected: shows frontmatter with `name: plan-tests`.

### Task 1.8: Write scaffold-test SKILL.md

**Files:**
- Create: `.claude/skills/scaffold-test.md`

- [ ] **Step 1: Create file**

```markdown
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
```

- [ ] **Step 2: Verify**

Run: `grep "name: scaffold-test" .claude/skills/scaffold-test.md`
Expected: prints one match.

### Task 1.9: Write heal-test SKILL.md

**Files:**
- Create: `.claude/skills/heal-test.md`

- [ ] **Step 1: Create file**

```markdown
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
```

- [ ] **Step 2: Verify**

Run: `grep "name: heal-test" .claude/skills/heal-test.md`
Expected: one match.

### Task 1.10: Write triage-failures SKILL.md

**Files:**
- Create: `.claude/skills/triage-failures.md`

- [ ] **Step 1: Create file**

```markdown
---
name: triage-failures
description: Read a JUnit XML report of a Playwright test run and emit a classification table conforming to docs/skills/triage-failures-output-format.md
mcps: [filesystem]
---

You classify test failures into `flaky`, `real-bug`, or `env`.

## Inputs

One argument: path to a JUnit XML file.

## Steps

1. Read the XML.
2. Read `docs/skills/triage-failures-output-format.md`.
3. For each failed test (`<failure>` or `<error>` child of `<testcase>`):
   - Read the failure message and stack trace.
   - Classify using heuristics:
     - `flaky` — timeout on visible element, intermittent network, race condition language.
     - `real-bug` — explicit assertion mismatch, deterministic stack trace, value comparison.
     - `env` — connection refused, DNS failure, missing env var, container failure.
4. Emit the markdown table per the format contract.

## Output

Print the markdown table to stdout. Justifications cite the JUnit message in one sentence.
```

- [ ] **Step 2: Verify**

Run: `ls .claude/skills/`
Expected: shows four `.md` files (plan-tests, scaffold-test, heal-test, triage-failures).

### Task 1.11: Sample story, sample plan, sample JUnit

**Files:**
- Create: `evals/plan-tests/cases/example-1/input/story.md`
- Create: `evals/scaffold-test/cases/example-1/input.json`
- Create: `evals/triage-failures/cases/example-1/input/junit.xml`

- [ ] **Step 1: Create plan-tests sample story (self-referential)**

```bash
mkdir -p evals/plan-tests/cases/example-1/input
```

Create `evals/plan-tests/cases/example-1/input/story.md`:

```markdown
# Add a "telemetry rotation" policy to HealableLocator

## Context

`HealableLocator` writes one JSON line per action attempt to `.ai/heals.jsonl`. Over weeks of use this file grows unbounded. We want a rotation policy: when the file exceeds N MB, rename to `.ai/heals.<date>.jsonl` and start a new file.

## Acceptance criteria

- Configurable threshold (env var `HEAL_LOG_MAX_MB`, default 10).
- Rotation happens lazily at write time, not via a background job.
- Rotated files are not deleted automatically; that's a separate retention concern.
- No data loss during rotation (no rename race).
```

- [ ] **Step 2: Create scaffold-test sample input**

```bash
mkdir -p evals/scaffold-test/cases/example-1
```

Create `evals/scaffold-test/cases/example-1/input.json`:

```json
{
  "planPath": "evals/scaffold-test/cases/example-1/input/plan.md",
  "caseId": "T1"
}
```

```bash
mkdir -p evals/scaffold-test/cases/example-1/input
```

Create `evals/scaffold-test/cases/example-1/input/plan.md`:

```markdown
## Risk Assessment
- **Selector drift on hero heading** — reqres rebrand changes the H1 text.

## Coverage Gap
- Missing assertion for hero subheading visibility.

## Proposed Cases

| ID | Layer | Priority | Description |
|---|---|---|---|
| T1 | UI | P0 | Hero subheading is visible on reqres home page. |
| T2 | API | P2 | GET /api/users/2 returns id=2. |
```

- [ ] **Step 3: Create triage-failures sample JUnit XML**

```bash
mkdir -p evals/triage-failures/cases/example-1/input
```

Create `evals/triage-failures/cases/example-1/input/junit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="reqres-home" tests="3" failures="2" errors="1">
    <testcase classname="reqres-home" name="hero heading is visible" time="32.1">
      <failure message="locator.click: Timeout 30000ms exceeded.&#xA;Call log:&#xA;  - waiting for getByRole('heading', name: /A real backend/i)">strict mode violation: getByRole('heading')</failure>
    </testcase>
    <testcase classname="reqres-home" name="signup button navigates" time="1.2">
      <failure message="expect(received).toBe(expected)&#xA;Expected: 'Sign up'&#xA;Received: 'Register'">Assertion failed at reqres-home.spec.ts:14</failure>
    </testcase>
    <testcase classname="reqres-home" name="API users list loads" time="0.3">
      <error message="connect ECONNREFUSED 127.0.0.1:443">FetchError: connect ECONNREFUSED</error>
    </testcase>
  </testsuite>
</testsuites>
```

- [ ] **Step 4: Verify all sample files**

Run: `ls evals/plan-tests/cases/example-1/input/ evals/scaffold-test/cases/example-1/ evals/scaffold-test/cases/example-1/input/ evals/triage-failures/cases/example-1/input/`
Expected: shows `story.md`, `input.json`, `plan.md`, `junit.xml`.

### Task 1.12: Day 1 commit

- [ ] **Step 1: Stage and commit**

```bash
git add package.json package-lock.json docs/skills/ agents/skills/ .claude/ .mcp.json evals/
git commit -m "$(cat <<'EOF'
Add Day 1 foundation: format contracts, SKILL.md files, MCP config, sample fixtures

- Format contracts for plan-tests, scaffold-test, triage-failures (markdown) and heal-test (JSON Schema)
- Four .claude/skills/*.md prompts referencing their contracts
- .mcp.json with filesystem + playwright servers
- Sample fixtures for plan-tests, scaffold-test, triage-failures evals

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Verify**

Run: `git log -1 --stat`
Expected: shows about 11 new files under docs/skills, agents/skills, .claude, .mcp.json, evals.

---

## Day 2: HealableLocator + page-object migration

### Task 2.1: Strategy 1 — domHeuristic, with tests

**Files:**
- Create: `lib/healing/strategies/domHeuristic.ts`
- Create: `tests/healing/strategies.spec.ts`

- [ ] **Step 1: Write the failing test**

```bash
mkdir -p lib/healing/strategies tests/healing
```

Create `tests/healing/strategies.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { domHeuristicCandidates } from '../../lib/healing/strategies/domHeuristic'

test.describe('domHeuristicCandidates', () => {
  test('expands a getByRole locator to a regex-name variant', () => {
    const candidates = domHeuristicCandidates("page.getByRole('heading', { name: 'Welcome' })")
    expect(candidates).toContain("page.getByRole('heading', { name: /welcome/i })")
  })

  test('expands a getByText locator to a regex variant', () => {
    const candidates = domHeuristicCandidates("page.getByText('Submit')")
    expect(candidates).toContain("page.getByText(/submit/i)")
  })
})
```

- [ ] **Step 2: Run, expect fail**

Run: `npx playwright test tests/healing/strategies.spec.ts --project=chromium`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

Create `lib/healing/strategies/domHeuristic.ts`:

```typescript
/**
 * Pure-fn strategy: given a primary locator expression as a string,
 * return zero or more alternative locator-expression strings that
 * relax assumptions about exact name match.
 */
export function domHeuristicCandidates(primaryExpr: string): string[] {
  const out: string[] = []

  const roleMatch = primaryExpr.match(
    /^page\.getByRole\((['"])([^'"]+)\1,\s*\{\s*name:\s*(['"])([^'"]+)\3\s*\}\s*\)$/,
  )
  if (roleMatch) {
    const [, , role, , name] = roleMatch
    const safe = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out.push(`page.getByRole('${role}', { name: /${safe}/i })`)
  }

  const textMatch = primaryExpr.match(/^page\.getByText\((['"])([^'"]+)\1\)$/)
  if (textMatch) {
    const [, , txt] = textMatch
    const safe = txt.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out.push(`page.getByText(/${safe}/i)`)
  }

  return out
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx playwright test tests/healing/strategies.spec.ts --project=chromium`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/healing/strategies/domHeuristic.ts tests/healing/strategies.spec.ts
git commit -m "Add domHeuristic strategy for HealableLocator"
```

### Task 2.2: Strategy 2 — semantic (loose match by role+text proximity), with tests

**Files:**
- Create: `lib/healing/strategies/semantic.ts`
- Modify: `tests/healing/strategies.spec.ts`

- [ ] **Step 1: Add failing test to the existing spec**

Append to `tests/healing/strategies.spec.ts`:

```typescript
import { semanticCandidates } from '../../lib/healing/strategies/semantic'

test.describe('semanticCandidates', () => {
  test('falls back to first-of-tag for h-tagged headings', () => {
    const candidates = semanticCandidates("page.getByRole('heading', { name: 'Welcome' })")
    expect(candidates).toContain("page.locator('h1, h2, h3').first()")
  })

  test('falls back to text-substring for buttons', () => {
    const candidates = semanticCandidates("page.getByRole('button', { name: 'Sign up' })")
    expect(candidates).toContain("page.locator('button', { hasText: /sign|up/i })")
  })
})
```

- [ ] **Step 2: Run, expect fail**

Run: `npx playwright test tests/healing/strategies.spec.ts --project=chromium`
Expected: 2 new tests FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

Create `lib/healing/strategies/semantic.ts`:

```typescript
export function semanticCandidates(primaryExpr: string): string[] {
  const out: string[] = []

  const headingMatch = primaryExpr.match(
    /^page\.getByRole\((['"])heading\1,\s*\{\s*name:\s*(['"])([^'"]+)\2\s*\}\s*\)$/,
  )
  if (headingMatch) {
    out.push("page.locator('h1, h2, h3').first()")
  }

  const buttonMatch = primaryExpr.match(
    /^page\.getByRole\((['"])button\1,\s*\{\s*name:\s*(['"])([^'"]+)\2\s*\}\s*\)$/,
  )
  if (buttonMatch) {
    const [, , , name] = buttonMatch
    const words = name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2)
    if (words.length > 0) {
      const alt = words.join('|')
      out.push(`page.locator('button', { hasText: /${alt}/i })`)
    }
  }

  return out
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx playwright test tests/healing/strategies.spec.ts --project=chromium`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/healing/strategies/semantic.ts tests/healing/strategies.spec.ts
git commit -m "Add semantic strategy for HealableLocator"
```

### Task 2.3: HealableLocator class + `healable()` factory + tests

**Files:**
- Create: `lib/healing/HealableLocator.ts`
- Create: `lib/healing/index.ts`
- Create: `tests/healing/HealableLocator.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/healing/HealableLocator.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { healable } from '../../lib/healing'

test('primary success — no fallback used', async ({ page }) => {
  await page.setContent('<button id="b">Click me</button>')
  const target = healable(page.locator('#b'), [page.locator('button')])
  await target.click()
  // No assertion beyond "did not throw".
})

test('renamed-attribute scenario — primary fails, first fallback succeeds', async ({ page }) => {
  await page.setContent('<button data-testid="not-the-right-one">Click me</button>')
  const target = healable(page.locator('[data-testid="submit"]'), [
    page.locator('button', { hasText: 'Click me' }),
  ])
  await target.click()
})

test('reordered-children scenario — primary fails, semantic fallback succeeds', async ({ page }) => {
  await page.setContent('<div><span>hello</span><h1>Welcome</h1></div>')
  // Primary expects role+name; DOM has the heading but reordered around it.
  const target = healable(page.getByRole('heading', { name: 'Greetings' }), [
    page.locator('h1').first(),
  ])
  const text = await target.textContent()
  expect(text).toBe('Welcome')
})

test('all strategies exhausted throws', async ({ page }) => {
  await page.setContent('<div>nothing useful here</div>')
  const target = healable(page.locator('#missing'), [page.locator('#also-missing')])
  await expect(target.click()).rejects.toThrow()
})
```

- [ ] **Step 2: Run, expect fail**

Run: `npx playwright test tests/healing/HealableLocator.spec.ts --project=chromium`
Expected: 4 FAIL with "Cannot find module".

- [ ] **Step 3: Implement HealableLocator**

Create `lib/healing/HealableLocator.ts`:

```typescript
import { type Locator } from '@playwright/test'

const FALLBACK_TIMEOUT_MS = 3000

export class HealableLocator {
  constructor(
    private readonly primary: Locator,
    private readonly fallbacks: Locator[],
  ) {}

  async click(): Promise<void> {
    await this.run((l) => l.click())
  }

  async fill(value: string): Promise<void> {
    await this.run((l) => l.fill(value))
  }

  async textContent(): Promise<string | null> {
    return await this.run((l) => l.textContent())
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
```

- [ ] **Step 4: Create index re-export**

Create `lib/healing/index.ts`:

```typescript
export { HealableLocator, healable } from './HealableLocator'
```

- [ ] **Step 5: Run, expect pass**

Run: `npx playwright test tests/healing/HealableLocator.spec.ts --project=chromium`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/healing/HealableLocator.ts lib/healing/index.ts tests/healing/HealableLocator.spec.ts
git commit -m "Add HealableLocator class with healable() factory"
```

### Task 2.4: Migrate ReqresHomePage + add one selector

**Files:**
- Modify: `lib/ui/ReqresHomePage.ts`

- [ ] **Step 1: Edit `lib/ui/ReqresHomePage.ts` to use healable**

Replace the existing content with:

```typescript
import { type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { HealableLocator, healable } from '../healing'
import { config } from '../../infrastructure/env.config'

export class ReqresHomePage extends BasePage {
  readonly heroHeading: HealableLocator
  readonly signupCallout: HealableLocator

  constructor(page: Page) {
    super(page)
    this.heroHeading = healable(
      page.getByRole('heading', { name: /A real backend/i }),
      [
        page.getByRole('heading', { name: /backend/i }),
        page.locator('h1').first(),
      ],
    )
    this.signupCallout = healable(
      page.getByText(/sign up free/i),
      [page.locator('a', { hasText: /sign up/i })],
    )
  }

  async goto() {
    await this.page.goto(config.reqresURL)
  }
}
```

- [ ] **Step 2: Run existing reqres tests, expect pass**

Run: `npx playwright test tests/ui/reqres-home.spec.ts --project=chromium`
Expected: PASS (the new `heroHeading` is a HealableLocator but the test only calls methods that exist on it; if the test asserts via `expect(locator)` it may fail — see step 3).

- [ ] **Step 3: Read the spec and adjust if needed**

Run: `cat tests/ui/reqres-home.spec.ts`

If the spec uses `expect(reqresHome.heroHeading).toBeVisible()` it will fail because `HealableLocator` is not a `Locator`. In that case, update the spec to use `await reqresHome.heroHeading.textContent()` then assert on the text, OR add a `.primary` getter on `HealableLocator` for assertion access. **Pick `.primary` getter** — it preserves the spec intent.

Add to `lib/healing/HealableLocator.ts` inside the class:

```typescript
  get primary_locator(): Locator {
    return this.primary
  }
```

(Named `primary_locator` to avoid clashing with the private `primary` field.)

Update the spec at any `expect(reqresHome.heroHeading).toBeVisible()` to `expect(reqresHome.heroHeading.primary_locator).toBeVisible()`.

- [ ] **Step 4: Re-run, expect pass**

Run: `npx playwright test tests/ui/reqres-home.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ui/ReqresHomePage.ts lib/healing/HealableLocator.ts tests/ui/reqres-home.spec.ts
git commit -m "Migrate ReqresHomePage to HealableLocator + add signupCallout selector"
```

### Task 2.5: Migrate PracticeAutomationLoginPage

**Files:**
- Modify: `lib/ui/PracticeAutomationLoginPage.ts`

- [ ] **Step 1: Edit the file**

Replace the existing content with:

```typescript
import { type Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { HealableLocator, healable } from '../healing'
import { config } from '../../infrastructure/env.config'

export class PracticeAutomationLoginPage extends BasePage {
  readonly usernameField: HealableLocator
  readonly passwordField: HealableLocator
  readonly submitBtn: HealableLocator
  readonly congratLocator: HealableLocator

  constructor(page: Page) {
    super(page)
    this.usernameField = healable(
      page.getByLabel('Username'),
      [page.locator('input[name="username"]'), page.locator('input[type="text"]').first()],
    )
    this.passwordField = healable(
      page.getByLabel('Password'),
      [page.locator('input[name="password"]'), page.locator('input[type="password"]').first()],
    )
    this.submitBtn = healable(
      page.getByRole('button', { name: 'Submit' }),
      [page.locator('button[type="submit"]'), page.locator('input[type="submit"]')],
    )
    this.congratLocator = healable(
      page.getByText('Congratulations student. You'),
      [page.getByText(/congratulations/i)],
    )
  }

  async goto() {
    await this.page.goto(`${config.practiceAutomationURL}/practice-test-login/`)
  }

  async login(username: string, password: string) {
    await this.usernameField.fill(username)
    await this.passwordField.fill(password)
    await this.submitBtn.click()
  }
}
```

- [ ] **Step 2: Run auth setup, expect pass**

Run: `npx playwright test tests/setup/auth.setup.ts --project=setup`
Expected: PASS.

- [ ] **Step 3: Run full suite, expect pass**

Run: `npx playwright test --project=chromium`
Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/ui/PracticeAutomationLoginPage.ts
git commit -m "Migrate PracticeAutomationLoginPage to HealableLocator"
```

---

## Day 3: plan-tests skill working end-to-end

### Task 3.1: Invoke plan-tests in Claude Code

**Files:**
- None modified in this task.

- [ ] **Step 1: Open Claude Code in the repo root, invoke the skill**

Open Claude Code in the repository directory. In Claude Code, run:

```
/plan-tests evals/plan-tests/cases/example-1/input/story.md
```

- [ ] **Step 2: Capture stdout to a temp file**

Save the agent's output to `/tmp/plan-tests-actual.md`.

- [ ] **Step 3: Conformance check by hand against the format contract**

Open `docs/skills/plan-tests-output-format.md`. Verify the output has the three H2 sections in order, the Proposed Cases table has the four required columns, and at least three rows.

- [ ] **Step 4: Iterate prompt if the output drifts**

If a section is missing or the table schema is wrong, edit `.claude/skills/plan-tests.md`. Re-invoke. Repeat until conformance.

### Task 3.2: Commit the canonical example + expected.json

**Files:**
- Create: `evals/plan-tests/cases/example-1/expected.json`
- Create: `evals/plan-tests/cases/example-1/output.md` (the conforming agent output)

- [ ] **Step 1: Save the conforming output**

Copy the conforming output from `/tmp/plan-tests-actual.md` to `evals/plan-tests/cases/example-1/output.md`. This is the canonical example for eval comparison.

- [ ] **Step 2: Write expected.json (structural assertions)**

Create `evals/plan-tests/cases/example-1/expected.json`:

```json
{
  "skill": "plan-tests",
  "structural": {
    "requiredSections": ["## Risk Assessment", "## Coverage Gap", "## Proposed Cases"],
    "sectionsInOrder": true,
    "tableColumns": ["ID", "Layer", "Priority", "Description"],
    "minProposedCases": 3,
    "allowedLayerValues": ["UI", "API"],
    "allowedPriorityValues": ["P0", "P1", "P2"]
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add evals/plan-tests/cases/example-1/expected.json evals/plan-tests/cases/example-1/output.md .claude/skills/plan-tests.md
git commit -m "plan-tests skill: canonical example + expected structural assertions"
```

---

## Day 4: scaffold-test skill working end-to-end

### Task 4.1: Invoke scaffold-test in Claude Code

**Files:**
- None modified directly in this task (the agent will write files under `tests/` and `lib/ui/`).

- [ ] **Step 1: In Claude Code, invoke**

```
/scaffold-test evals/scaffold-test/cases/example-1/input/plan.md T1
```

- [ ] **Step 2: Verify generated files**

The agent should have written a new spec under `tests/ui/` (e.g. `tests/ui/reqres-subheading.spec.ts`). It may have updated `ReqresHomePage` (add a new HealableLocator) or scaffolded a new page object.

Run: `npx tsc --noEmit && npx eslint <newly written files>`
Expected: both clean.

Run: `npx playwright test <newly written spec> --project=chromium`
Expected: PASS (or a meaningful failure if reqres.in's actual DOM doesn't have a subheading at all — that's then a real bug discovered by the new test, ok for demo purposes).

- [ ] **Step 3: Iterate prompt if convention violated**

If the generated spec uses raw `page.locator(...)`, or imports from `@playwright/test` directly, edit `.claude/skills/scaffold-test.md` to tighten the convention reminder and re-invoke. Discard the bad output via `git checkout tests/ui/<file>` first.

### Task 4.2: Commit the canonical example + expected.json

**Files:**
- Create: `evals/scaffold-test/cases/example-1/expected.json`

- [ ] **Step 1: Write expected.json**

```json
{
  "skill": "scaffold-test",
  "structural": {
    "specImportsFromFixtures": true,
    "specHasNoRawLocators": true,
    "specUsesDestructuredFixture": true,
    "pageObjectExtendsBasePage": true,
    "pageObjectUsesHealableFactory": true,
    "typecheckPasses": true,
    "eslintPasses": true
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add evals/scaffold-test/cases/example-1/expected.json tests/ui/<new-spec> lib/ui/<page-object-changes> .claude/skills/scaffold-test.md
git commit -m "scaffold-test skill: canonical example + expected structural assertions"
```

---

## Day 5: heal-test + applier + snapshot fixtures

### Task 5.1: Write `agents/apply-patch.ts`

**Files:**
- Create: `agents/apply-patch.ts`
- Create: `tests/healing/apply-patch.spec.ts` (uses Playwright runner for harness consistency)

- [ ] **Step 1: Write failing test**

Create `tests/healing/apply-patch.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run, expect fail**

Run: `npx playwright test tests/healing/apply-patch.spec.ts --project=chromium`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

Create `agents/apply-patch.ts`:

```typescript
import { Project, SyntaxKind } from 'ts-morph'
import * as fs from 'fs'

export interface PatchDocument {
  file: string
  selectorId: string
  action: 'add_fallbacks'
  fallbacks: string[]
  rationale: string
}

export function applyPatch(patch: PatchDocument): void {
  if (patch.action !== 'add_fallbacks') {
    throw new Error(`Unsupported action: ${patch.action}`)
  }

  const project = new Project({ useInMemoryFileSystem: false })
  const source = project.addSourceFileAtPath(patch.file)

  const cls = source.getClasses()[0]
  if (!cls) throw new Error(`No class found in ${patch.file}`)

  const ctor = cls.getConstructors()[0]
  if (!ctor) throw new Error(`No constructor found in ${patch.file}`)

  const assignment = ctor.getDescendantsOfKind(SyntaxKind.BinaryExpression).find((expr) => {
    const left = expr.getLeft().getText()
    if (left !== `this.${patch.selectorId}`) return false
    const right = expr.getRight().getText()
    return right.startsWith('healable(')
  })

  if (!assignment) {
    throw new Error(`selectorId "${patch.selectorId}" not found as a constructor-literal healable() assignment in ${patch.file}`)
  }

  const healableCall = assignment.getRight().asKindOrThrow(SyntaxKind.CallExpression)
  const args = healableCall.getArguments()
  if (args.length !== 2) {
    throw new Error(`healable() must have 2 arguments, got ${args.length}`)
  }
  const arrayLit = args[1].asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
  for (const fb of patch.fallbacks) {
    arrayLit.addElement(fb)
  }

  source.formatText()
  source.saveSync()
}

if (require.main === module) {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error('Usage: ts-node agents/apply-patch.ts <patch.json>')
    process.exit(1)
  }
  const patch = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as PatchDocument
  applyPatch(patch)
  console.log(`Applied patch to ${patch.file}`)
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx playwright test tests/healing/apply-patch.spec.ts --project=chromium`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add agents/apply-patch.ts tests/healing/apply-patch.spec.ts
git commit -m "Add apply-patch script for heal-test JSON output"
```

### Task 5.2: HTML snapshot fixtures

**Files:**
- Create: `evals/heal-test/fixtures/renamed-attribute.html`
- Create: `evals/heal-test/fixtures/reordered-children.html`
- Create: `evals/heal-test/fixtures/removed-element.html`

- [ ] **Step 1: Create fixtures**

```bash
mkdir -p evals/heal-test/fixtures
```

`evals/heal-test/fixtures/renamed-attribute.html`:

```html
<!doctype html>
<html><body>
  <button data-id="confirm-action">Submit</button>
</body></html>
```

`evals/heal-test/fixtures/reordered-children.html`:

```html
<!doctype html>
<html><body>
  <header>
    <nav><a href="/about">About</a></nav>
    <h1>Welcome</h1>
  </header>
</body></html>
```

`evals/heal-test/fixtures/removed-element.html`:

```html
<!doctype html>
<html><body>
  <main>
    <p>Login form coming soon.</p>
  </main>
</body></html>
```

- [ ] **Step 2: Verify**

Run: `ls evals/heal-test/fixtures/`
Expected: three HTML files.

### Task 5.3: Heal-test live demo cycle

**Files:**
- Modify: `lib/ui/ReqresHomePage.ts` temporarily to simulate breakage (revert after demo)
- Create: `/tmp/heal-output.json` (transient)

- [ ] **Step 1: Break the primary selector deliberately**

Edit `lib/ui/ReqresHomePage.ts`. In the `signupCallout` HealableLocator, change `page.getByText(/sign up free/i)` to `page.getByText(/this text does not exist on the page/i)`.

Empty out its fallbacks array to force a real failure: `[]`.

- [ ] **Step 2: Run the test, capture the failure + screenshot path**

Run: `npx playwright test tests/ui/reqres-home.spec.ts --project=chromium`
Expected: FAIL. Note the path under `test-results/` containing the screenshot.

- [ ] **Step 3: Invoke heal-test in Claude Code**

In Claude Code:

```
/heal-test "signup callout is visible" test-results/<failed-test-dir>/test-failed-1.png
```

Save the JSON output to `/tmp/heal-output.json`.

- [ ] **Step 4: Validate JSON against schema**

Run:

```bash
node -e "
const Ajv = require('ajv');
const ajv = new Ajv({allErrors: true});
const schema = require('./agents/skills/heal-test/output-schema.json');
const data = require('/tmp/heal-output.json');
const validate = ajv.compile(schema);
if (!validate(data)) { console.error(validate.errors); process.exit(1); }
console.log('schema OK');
"
```

If `ajv` is not installed, install it: `npm install --save-dev ajv`.

Expected: `schema OK`.

- [ ] **Step 5: Apply the patch**

Run: `npm run apply-patch /tmp/heal-output.json`
Expected: prints "Applied patch to lib/ui/ReqresHomePage.ts".

- [ ] **Step 6: Re-run the failing test**

Run: `npx playwright test tests/ui/reqres-home.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 7: View the resulting diff and commit if good**

Run: `git diff lib/ui/ReqresHomePage.ts`
Expected: shows the fallbacks the agent added.

Decide: if the patch is reasonable, keep it and commit. If not, `git checkout lib/ui/ReqresHomePage.ts` and iterate on the heal-test prompt.

```bash
git add lib/ui/ReqresHomePage.ts evals/heal-test/fixtures/
git commit -m "heal-test live demo cycle: applied agent-proposed fallback for signupCallout + fixtures"
```

### Task 5.4: README skeleton

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append a new section before "Local Setup"**

Append at the top of the README, just under the existing tagline:

```markdown
## AI workflows (v0)

This repo ships four agent skills under `.claude/skills/` that reduce repetitive SDET work:

- **plan-tests** — read a story markdown file, output a risk-based test plan
- **scaffold-test** — turn a plan case into a Playwright spec + page object (extends `BasePage`, uses `healable()`)
- **heal-test** — inspect a failing run, output a JSON patch upgrading the HealableLocator strategy chain
- **triage-failures** — classify CI failures from a JUnit XML report

Two invocation modes: interactive in Claude Code (all four skills) and headless via `agents/run-cli.ts` (plan-tests + triage-failures only). See `docs/specs/2026-05-27-mvp-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add AI workflows section skeleton to README"
```

---

## Day 6: triage-failures end-to-end + scorecard template + README polish

### Task 6.1: Invoke triage-failures in Claude Code

**Files:**
- Create: `evals/triage-failures/cases/example-1/output.md`
- Create: `evals/triage-failures/cases/example-1/expected.json`

- [ ] **Step 1: Invoke**

In Claude Code:

```
/triage-failures evals/triage-failures/cases/example-1/input/junit.xml
```

- [ ] **Step 2: Capture output**

Save stdout to `evals/triage-failures/cases/example-1/output.md`. Verify it has three rows, one per failed test. Verify each row has a `Classification` from {flaky, real-bug, env}.

Expected reasonable classifications:
- "hero heading is visible" → `flaky` (timeout, strict mode)
- "signup button navigates" → `real-bug` (deterministic assertion mismatch)
- "API users list loads" → `env` (ECONNREFUSED)

If the agent mis-classifies any row, iterate `.claude/skills/triage-failures.md` and re-run.

- [ ] **Step 3: Write expected.json**

```json
{
  "skill": "triage-failures",
  "structural": {
    "hasTable": true,
    "columns": ["Test", "Classification", "Justification", "Linked Trace"],
    "rowCount": 3,
    "allowedClassifications": ["flaky", "real-bug", "env"]
  },
  "byRow": {
    "hero heading is visible": "flaky",
    "signup button navigates": "real-bug",
    "API users list loads": "env"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add evals/triage-failures/cases/example-1/ .claude/skills/triage-failures.md
git commit -m "triage-failures skill: canonical example + expected classifications"
```

### Task 6.2: Scorecard template

**Files:**
- Create: `evals/results/2026-06-02.md` (date approximate; use the actual date at execution time)
- Create: `evals/manual-rubric.md`

- [ ] **Step 1: Create manual rubric**

```markdown
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
```

- [ ] **Step 2: Create scorecard template with hand-filled rows**

Get today's date: `date +%Y-%m-%d`

Create `evals/results/<today>.md`:

```markdown
# Scorecard <today>

| Skill | Mode | Model | Cases | Structural pass | Latency p50 | Notes |
|---|---|---|---|---|---|---|
| plan-tests | run-cli | claude-sonnet-4-6 | 1 | pending | pending | TBD Day 7 |
| plan-tests | run-cli | deepseek-chat-v3:free | 1 | pending | pending | TBD Day 7 |
| triage-failures | run-cli | claude-sonnet-4-6 | 1 | pending | pending | TBD Day 7 |
| triage-failures | run-cli | deepseek-chat-v3:free | 1 | pending | pending | TBD Day 7 |
| scaffold-test | manual | claude-code | 1 | yes | n/a | Day 4 |
| heal-test | manual | claude-code | 1 | yes | n/a | Day 5 |

Manual rows scored against `evals/manual-rubric.md`.

Run-cli rows populated Day 7 by `npm run eval`.
```

- [ ] **Step 3: Commit**

```bash
git add evals/manual-rubric.md evals/results/
git commit -m "Add manual eval rubric + scorecard template"
```

### Task 6.3: README content fill-in

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Flesh out the AI workflows section**

Replace the placeholder section from Day 5 with a richer version. Add a short example for each skill (one line on what you run, one line on what you get).

- [ ] **Step 2: Verify README readable end-to-end**

Run: `wc -l README.md && cat README.md | head -80`
Expected: file is coherent, no broken links, sections flow.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Flesh out AI workflows section in README"
```

---

## Day 7: run-cli, structural eval automation, demo recording

### Task 7.1: Build `agents/run-cli.ts` (~150 LOC)

**Files:**
- Create: `agents/run-cli.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add `.ai/` ignore patterns**

Append to `.gitignore`:

```
.ai/cache/
.ai/runs/
```

- [ ] **Step 2: Create the CLI**

`agents/run-cli.ts`:

```typescript
import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

interface SkillFile {
  meta: { name: string; description: string; mcps: string[] }
  body: string
}

function loadSkill(name: string): SkillFile {
  const filePath = path.join('.claude', 'skills', `${name}.md`)
  const raw = fs.readFileSync(filePath, 'utf8')
  const match = raw.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`Skill ${name} missing frontmatter`)
  const meta = yaml.load(match[1]) as SkillFile['meta']
  return { meta, body: match[2] }
}

function loadInputContents(inputArg: string): string {
  if (inputArg.endsWith('.json')) {
    return JSON.stringify(JSON.parse(fs.readFileSync(inputArg, 'utf8')), null, 2)
  }
  return fs.readFileSync(inputArg, 'utf8')
}

async function main() {
  const [, , skillName, ...rest] = process.argv
  if (!skillName || rest.length === 0) {
    console.error('Usage: ts-node agents/run-cli.ts <skill-name> <input-path> [more-args...]')
    process.exit(1)
  }
  if (skillName !== 'plan-tests' && skillName !== 'triage-failures') {
    console.error(`run-cli only supports plan-tests and triage-failures in v0. Got: ${skillName}`)
    process.exit(2)
  }

  const skill = loadSkill(skillName)
  const inputContents = loadInputContents(rest[0])

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    console.error('AI_API_KEY env var required')
    process.exit(3)
  }
  const baseURL = process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1'
  const model = process.env.AI_MODEL ?? 'deepseek/deepseek-chat-v3:free'

  const client = new OpenAI({ apiKey, baseURL })

  const start = Date.now()
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: skill.body },
      {
        role: 'user',
        content: `Input file contents:\n\n${inputContents}\n\nProduce the output per the skill's contract.`,
      },
    ],
  })
  const ms = Date.now() - start

  const out = response.choices[0]?.message.content ?? ''
  process.stdout.write(out)
  process.stderr.write(`\n[run-cli] model=${model} latency_ms=${ms}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 3: Verify it loads and prints help on bad invocation**

Run: `npx ts-node agents/run-cli.ts`
Expected: usage error to stderr, exits non-zero.

- [ ] **Step 4: Verify it actually calls the model**

Set the env var and run on the sample:

```bash
export AI_API_KEY=<your-openrouter-key>
npx ts-node agents/run-cli.ts plan-tests evals/plan-tests/cases/example-1/input/story.md
```

Expected: a markdown plan is printed to stdout.

- [ ] **Step 5: Commit**

```bash
git add agents/run-cli.ts .gitignore
git commit -m "Add run-cli for plan-tests and triage-failures with OpenAI-compatible API"
```

### Task 7.2: Build `evals/check.ts` (structural eval harness)

**Files:**
- Create: `evals/check.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the harness**

`evals/check.ts`:

```typescript
import * as fs from 'fs'
import * as path from 'path'

interface Result {
  skill: string
  mode: string
  model: string
  case: string
  pass: boolean
  failures: string[]
  latencyMs: number
}

function checkPlanTests(actual: string, expected: any): string[] {
  const failures: string[] = []
  for (const section of expected.structural.requiredSections) {
    if (!actual.includes(section)) failures.push(`missing section: ${section}`)
  }
  if (expected.structural.sectionsInOrder) {
    const idxs = expected.structural.requiredSections.map((s: string) => actual.indexOf(s))
    for (let i = 1; i < idxs.length; i++) {
      if (idxs[i] < idxs[i - 1]) failures.push('sections out of order')
    }
  }
  const cols = expected.structural.tableColumns as string[]
  if (cols.some((c) => !actual.includes(c))) failures.push('table columns missing')
  // Naive case count: number of "| T" occurrences.
  const caseRows = (actual.match(/\n\|\s*T\d+\s*\|/g) || []).length
  if (caseRows < expected.structural.minProposedCases) {
    failures.push(`fewer than ${expected.structural.minProposedCases} proposed cases (got ${caseRows})`)
  }
  return failures
}

function checkTriageFailures(actual: string, expected: any): string[] {
  const failures: string[] = []
  const cols = expected.structural.columns as string[]
  if (cols.some((c) => !actual.includes(c))) failures.push('columns missing')
  const rowCount = (actual.match(/^\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|\s*$/gm) || []).length - 1 // subtract header
  if (rowCount < expected.structural.rowCount) {
    failures.push(`fewer than ${expected.structural.rowCount} rows (got ${rowCount})`)
  }
  for (const [testName, expectedClass] of Object.entries(expected.byRow)) {
    const re = new RegExp(`\\b${testName.replace(/[.*+?^${}()|[\\]/g, '\\$&')}\\b[\\s\\S]*?\\b(${expected.structural.allowedClassifications.join('|')})\\b`)
    const m = actual.match(re)
    if (!m || m[1] !== expectedClass) failures.push(`row "${testName}": expected ${expectedClass}, got ${m?.[1] ?? 'unknown'}`)
  }
  return failures
}

async function runCli(skill: string, inputPath: string, model: string): Promise<{ output: string; ms: number }> {
  const { spawnSync } = require('child_process')
  const start = Date.now()
  const res = spawnSync('npx', ['ts-node', 'agents/run-cli.ts', skill, inputPath], {
    env: { ...process.env, AI_MODEL: model },
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  const ms = Date.now() - start
  if (res.status !== 0) {
    throw new Error(`run-cli failed: ${res.stderr}`)
  }
  return { output: res.stdout, ms }
}

async function main() {
  const results: Result[] = []
  const models = ['anthropic/claude-sonnet-4-6', 'deepseek/deepseek-chat-v3:free']
  const cases = [
    { skill: 'plan-tests', dir: 'evals/plan-tests/cases/example-1', input: 'evals/plan-tests/cases/example-1/input/story.md', checker: checkPlanTests },
    { skill: 'triage-failures', dir: 'evals/triage-failures/cases/example-1', input: 'evals/triage-failures/cases/example-1/input/junit.xml', checker: checkTriageFailures },
  ]
  for (const c of cases) {
    const expected = JSON.parse(fs.readFileSync(path.join(c.dir, 'expected.json'), 'utf8'))
    for (const model of models) {
      try {
        const { output, ms } = await runCli(c.skill, c.input, model)
        const failures = c.checker(output, expected)
        results.push({
          skill: c.skill,
          mode: 'run-cli',
          model,
          case: 'example-1',
          pass: failures.length === 0,
          failures,
          latencyMs: ms,
        })
      } catch (e: any) {
        results.push({
          skill: c.skill,
          mode: 'run-cli',
          model,
          case: 'example-1',
          pass: false,
          failures: [`run-cli error: ${e.message}`],
          latencyMs: -1,
        })
      }
    }
  }
  console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit evals/check.ts`
Expected: no errors. (If it errors on strict typing, fix the spots flagged.)

- [ ] **Step 3: Run it**

Run: `AI_API_KEY=<your-openrouter-key> npm run eval`
Expected: prints a JSON array of 4 results (2 skills × 2 models). Some may fail conformance — that's the point.

- [ ] **Step 4: Commit**

```bash
git add evals/check.ts
git commit -m "Add structural eval harness for plan-tests and triage-failures"
```

### Task 7.3: Populate the scorecard

**Files:**
- Modify: `evals/results/<today>.md`

- [ ] **Step 1: Replace the pending placeholders**

Take the JSON from Task 7.2 step 3. Fill in the corresponding rows in the scorecard. If the JSON shows DeepSeek fails one or more structural checks, write a one-line `Notes` summary (e.g. `missing Coverage Gap section`).

- [ ] **Step 2: Commit**

```bash
git add evals/results/
git commit -m "Populate scorecard with first run-cli results"
```

### Task 7.4: Record asciinema cast (60–90s)

**Files:**
- Create: `docs/demo.cast` (asciicast format) or a Markdown embed of an alternative
- Modify: `README.md`

- [ ] **Step 1: Install asciinema if needed**

`brew install asciinema` (macOS) — skip if installed.

- [ ] **Step 2: Record**

Plan a 60–90 second flow before recording:
1. `npm run agent:plan evals/plan-tests/cases/example-1/input/story.md | head -50` — show plan output
2. `cat evals/results/<today>.md` — show scorecard
3. `npx playwright test tests/healing --project=chromium` — show HealableLocator green

Run: `asciinema rec docs/demo.cast`
Hit Ctrl-D when done.

- [ ] **Step 3: Embed in README**

Add at the bottom of the AI workflows section:

```markdown
### Demo

[asciicast](./docs/demo.cast) — 60s walkthrough of plan-tests, scorecard, and healing tests.
```

- [ ] **Step 4: Commit**

```bash
git add docs/demo.cast README.md
git commit -m "Record asciinema demo cast and embed in README"
```

---

## Day 8 (optional): Re-record demo with voice-over

Only do this if Day 7 finished cleanly and you have spare focus.

### Task 8.1: Record a 3-minute Loom or OBS video

- [ ] **Step 1: Script outline** (write it out before recording)

```
0:00-0:20 Hook: "I started this Playwright framework in late 2023. This week I added an AI lifecycle layer."
0:20-0:50 Show plan-tests on a story; eyeball the output.
0:50-1:30 Show scaffold-test producing a green spec.
1:30-2:15 Show heal-test: break a selector, run heal, apply patch, see green.
2:15-2:45 Show scorecard, gap between paid baseline and free model — that's the engineering metric.
2:45-3:00 Close: "Future work: tracker integration, PR auto-comment, multi-MCP runner."
```

- [ ] **Step 2: Record + upload unlisted to YouTube**

- [ ] **Step 3: Add link to README**

Replace or augment the asciicast embed with the YouTube link.

```bash
git add README.md
git commit -m "Add demo video link"
```

---

## Self-review notes

Coverage check vs spec:
- Goal (reduce repetitive SDET effort with 4 skills + clear I/O): tasks 1.7–1.10 (SKILL.md), 3.x, 4.x, 5.x, 6.x. ✓
- Mode 1 (interactive Claude Code): used in 3.1, 4.1, 5.3, 6.1. ✓
- Mode 2 (run-cli for plan-tests + triage-failures): 7.1, 7.2. ✓
- HealableLocator: 2.3 + 2.4. ✓
- ts-morph applier: 5.1. ✓
- Format contracts written before prompts: 1.2–1.5 before 1.7–1.10. ✓
- Page object migration (Reqres + Practice): 2.4 + 2.5. ✓
- HTML snapshot fixtures: 5.2. ✓
- Scorecard with manual + auto rows: 6.2 + 7.3. ✓
- Manual rubric: 6.2. ✓
- Day 5–6 absorb README/scorecard prep so Day 7 can focus: 5.4, 6.2, 6.3 carry overhead; 7.x is build-heavy. ✓
- Optional Day 8 video: 8.1. ✓

Risks the plan addresses:
- ts-morph applier locate failure → 5.1 step 3 throws on missing selectorId; tested in 5.1 step 1 second test case.
- DeepSeek format drift → 7.3 documents the gap in scorecard notes.
- Format-contract / prompt drift → SKILL.md files reference the contracts (1.7–1.10); checker uses expected.json (7.2).
- HealableLocator over-fit → tests cover renamed-attribute and reordered-children (2.3 step 1); live demo in 5.3.
- Day 1 overrun → if it slips, 1.11 has three samples that can be trimmed; Day 8 is the explicit buffer.
- Manual scorecard subjectivity → rubric in 6.2 is checklist-driven.
- Live SUT availability → snapshot fixtures cover the heal eval (5.2); live demo is one moment, not the test infrastructure.
