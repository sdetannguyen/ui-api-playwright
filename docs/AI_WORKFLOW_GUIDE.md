# AI-Augmented Testing Workflow — User Guide

A practical guide to using the four agent skills shipped under `.claude/skills/`. Each skill targets one repetitive SDET task. They compose into an end-to-end flow but each one is also useful standalone.

> See `docs/specs/2026-05-27-mvp-design.md` for the design rationale, `docs/plans/2026-05-27-mvp-impl-plan.md` for the build plan, and `evals/results/` for skill quality scorecards.

---

## TL;DR

| Skill | Input | Output | Mode |
|---|---|---|---|
| **plan-tests** | A user story (markdown) | A risk-based test plan with proposed cases | interactive + headless |
| **scaffold-test** | A plan + a case ID | A Playwright spec + (optional) page object | interactive only |
| **heal-test** | A failed test + screenshot | A JSON patch adding fallback selectors | interactive only |
| **triage-failures** | A JUnit XML report | A markdown table classifying each failure | interactive + headless |

**Two invocation modes:**
- **Interactive** — type `/skill-name args` in Claude Code; the agent has full tool access (Playwright MCP, file system, etc.)
- **Headless** — run `ts-node agents/run-cli.ts <skill> <input>` against any OpenAI-compatible API; only `plan-tests` and `triage-failures` are pure text-in/text-out enough to work this way

---

## Prerequisites

### For interactive mode (all skills)
- Claude Code installed and pointed at this repo
- The four skills auto-discover from `.claude/skills/*.md` on session start

### For headless mode (`plan-tests`, `triage-failures` only)
- An OpenAI-compatible API key. Default base URL is OpenRouter; set `AI_BASE_URL` to use a different provider.
- Env vars:
  ```bash
  export AI_API_KEY=<your-openrouter-key>
  export AI_MODEL=anthropic/claude-sonnet-4-6   # or deepseek/deepseek-chat-v3:free, etc.
  export AI_BASE_URL=https://openrouter.ai/api/v1  # default
  ```

### For the eval harness
- Both API key and `npm install` complete
- `npm run eval` runs the structural eval suite (2 skills × N models)

---

## When to use which skill

```
New feature spec arrives
        │
        ▼
┌─────────────────┐
│   plan-tests    │  Convert story → risk-based test plan
└────────┬────────┘
         │ pick a case ID (T1, T2, ...)
         ▼
┌─────────────────┐
│  scaffold-test  │  Generate the spec + page object for that case
└────────┬────────┘
         │ test now exists
         ▼
   ┌─────────────┐
   │  Tests run  │
   └──────┬──────┘
          │
   ┌──────┴───────┐
   │              │
   ▼              ▼
PASSES         FAILS
                │
       ┌────────┴─────────┐
       │                  │
       ▼                  ▼
  Flaky / locator    Real bug / env
  changed?           issue?
       │                  │
       ▼                  ▼
┌──────────────┐  ┌──────────────────┐
│  heal-test   │  │ triage-failures  │
│  (+ apply)   │  │ (classify all    │
│              │  │  CI failures)    │
└──────────────┘  └──────────────────┘
```

**Rule of thumb:** `plan-tests` and `scaffold-test` are for **adding coverage**. `heal-test` and `triage-failures` are for **maintaining coverage**.

---

## Skill reference

### 1. `plan-tests`

**Purpose.** Read a user story or feature spec and produce a structured test plan with risks, coverage gaps, and concrete proposed cases.

**Interactive:**
```
/plan-tests evals/plan-tests/cases/example-1/input/story.md
```

**Headless:**
```bash
AI_API_KEY=... npm run agent:plan evals/plan-tests/cases/example-1/input/story.md
# or
ts-node agents/run-cli.ts plan-tests <story.md>
```

**Input.** A markdown file with at minimum: `## Context` and `## Acceptance criteria` sections. The richer the input, the better the plan.

**Output.** Markdown with three sections (see `docs/skills/plan-tests-output-format.md` for the contract):
1. `## Risk Assessment` — bulleted list of failure modes worth testing
2. `## Coverage Gap` — what existing tests already cover vs what's missing
3. `## Proposed Cases` — markdown table with columns `ID | Layer | Priority | Description`

**Example output (excerpt):**

```markdown
## Proposed Cases

| ID | Layer | Priority | Description |
|----|-------|----------|-------------|
| T1 | UI  | P0 | When `.ai/heals.jsonl` is under threshold, action appends one line without rename |
| T2 | UI  | P0 | When file exceeds threshold, next action renames to dated file |
| T5 | UI  | P1 | Two same-day rotations produce distinct files (no overwrite) |
| T6 | UI  | P2 | Rotation EACCES failure swallowed; action still succeeds |
```

**What to do with the output.** Pick the case(s) you want to implement first (usually all P0s) and pass the case ID to `scaffold-test`.

---

### 2. `scaffold-test`

**Purpose.** Take one proposed case and produce a runnable Playwright spec + (if needed) a new page object. Conforms strictly to framework conventions.

**Interactive only:**
```
/scaffold-test evals/plan-tests/cases/example-1/output.md T1
```

The first argument is the plan markdown; the second is the case ID from the `Proposed Cases` table.

**Why no headless mode?** scaffold-test needs to read multiple files (`lib/fixtures/`, `lib/ui/BasePage.ts`, `lib/ui/<closest-page>.ts`), inspect the live DOM if a new page object is needed, and write to multiple paths. The interactive agent has tool access for all of that; a headless API call would lose the file-system context.

**Non-negotiable conventions (enforced by the skill prompt):**
- Spec imports `test` and `expect` from `../../lib/fixtures` **only** — never directly from `@playwright/test`
- Spec uses destructured fixture parameters: `async ({ reqresHome }) => { ... }`
- Spec contains **zero** raw `page.locator(...)` or `page.getBy*(...)` calls — every selector goes through the page object
- Page object extends `BasePage` and uses `healable(primary, [fallbacks])` for every selector
- Generated code passes `npx eslint <new files>` before the skill returns

**Output files:**
- `tests/<layer>/<slug>.spec.ts` (always)
- `lib/ui/<Name>Page.ts` (only if a new page object is needed; otherwise the existing one gets a new HealableLocator field)

**Verifying the output by hand.** Use `evals/manual-rubric.md` — the scaffold-test checklist. All boxes yes = pass.

---

### 3. `heal-test`

**Purpose.** A test failed because a locator went stale (page redesign, attribute rename, DOM reordering). `heal-test` inspects the failing page, proposes new fallback selectors, and emits a JSON patch. `apply-patch.ts` applies the patch via ts-morph CST mutation.

**Critical design choice:** `heal-test` **only adds fallbacks**. It never edits the primary selector or the test code. A human (or a follow-up `scaffold-test` call) fixes the primary; the agent only widens the rescue net.

**Interactive:**
```
/heal-test "signup callout is visible" test-results/<failed-dir>/test-failed-1.png > /tmp/heal-output.json
```

First arg = the failing test name (matches the `test(...)` body). Second arg = path to the failure screenshot.

**Apply the patch:**
```bash
npm run apply-patch /tmp/heal-output.json
```

**Then re-run the test:**
```bash
npx playwright test tests/ui/<spec>.spec.ts --project=chromium
```

The fallback chain rescues the broken primary; the test passes again. Review the diff:
```bash
git diff lib/ui/
```

You should see new entries added to a `[fallbacks]` array — and nothing else.

**JSON patch shape** (validated against `agents/skills/heal-test/output-schema.json`):
```json
{
  "file": "lib/ui/ReqresHomePage.ts",
  "selectorId": "signupCallout",
  "action": "add_fallbacks",
  "fallbacks": [
    "page.getByRole('link', { name: /create your backend/i })",
    "page.getByText(/free to try/i)"
  ],
  "rationale": "Live DOM rebranded; CTA is now 'Create your backend'. Role+name regex tolerates copy drift; text regex tolerates link refactors."
}
```

**Action types supported:** `add_fallbacks` only (v0). Future: `replace_primary`, `remove_selector`.

**Why no headless mode?** heal-test needs to navigate the live page and read the DOM. Headless would mean shipping a screenshot + DOM dump as raw text to a chat completion — viable but slow and costly. Interactive use of Playwright MCP is the right call here.

---

### 4. `triage-failures`

**Purpose.** A CI run produced N failed tests. Classify each as `flaky`, `real-bug`, or `env` so the triage human knows where to look first.

**Interactive:**
```
/triage-failures evals/triage-failures/cases/example-1/input/junit.xml
```

**Headless:**
```bash
AI_API_KEY=... npm run agent:triage evals/triage-failures/cases/example-1/input/junit.xml
```

**Input.** A JUnit XML report (most CI systems produce this).

**Output.** Markdown table:

```markdown
| Test | Classification | Justification | Linked Trace |
|------|----------------|---------------|--------------|
| hero heading is visible | flaky | TimeoutError + strict mode violation — race signature | n/a |
| signup button navigates | real-bug | expect(received).toBe('Sign up'); got 'Register' | n/a |
| API users list loads | env | ECONNREFUSED 127.0.0.1:443 — service down | n/a |
```

**Classification rules:**
- `flaky` — timeouts, strict-mode violations, race conditions, intermittent network blips
- `real-bug` — deterministic assertion mismatches with concrete Expected/Received values
- `env` — connection refused, DNS, service unreachable, infrastructure failures

Paste the output directly into a triage doc or PR comment.

---

## Common workflows

### Workflow A: Adding coverage for a new feature
```bash
# 1. Write a story under stories/
vi stories/new-feature.md

# 2. Generate the plan
/plan-tests stories/new-feature.md > evals/plan-tests/new-feature/output.md

# 3. Pick a case, scaffold it
/scaffold-test evals/plan-tests/new-feature/output.md T1

# 4. Run the new spec to make sure it works against the real app
npx playwright test tests/ui/<new-spec>.spec.ts --project=chromium

# 5. Repeat step 3 for each case you want to implement
```

### Workflow B: A test started failing in CI

```bash
# 1. Run the test locally, capture the failure
npx playwright test tests/ui/login.spec.ts --project=chromium
# → writes test-results/.../test-failed-1.png

# 2. Heal it
/heal-test "login button is visible" test-results/.../test-failed-1.png > /tmp/heal.json

# 3. Validate the patch
node -e "const Ajv = require('ajv/dist/2020'); const ajv = new Ajv({allErrors: true}); const schema = require('./agents/skills/heal-test/output-schema.json'); const data = require('/tmp/heal.json'); if (!ajv.compile(schema)(data)) { console.error('INVALID'); process.exit(1); } console.log('OK')"

# 4. Apply + re-run
npm run apply-patch /tmp/heal.json
npx playwright test tests/ui/login.spec.ts --project=chromium  # should pass

# 5. Review the diff before committing
git diff lib/ui/LoginPage.ts
# only added entries in [fallbacks] arrays — no other changes
```

### Workflow C: Triaging a CI run

```bash
# 1. Download junit.xml from the CI artifacts
curl -o /tmp/junit.xml <ci-artifact-url>

# 2. Classify
/triage-failures /tmp/junit.xml > /tmp/triage.md

# 3. Paste into the triage doc or PR comment
cat /tmp/triage.md
```

---

## Evaluation & quality tracking

Skill quality changes when models update or skill prompts are edited. The `evals/` harness tracks regression.

### Structural evals (automated)

```bash
AI_API_KEY=... npm run eval
```

Runs the canonical case for `plan-tests` and `triage-failures` against multiple models, compares output against `expected.json`, prints a JSON array of pass/fail per (skill, model) pair.

Currently configured models (edit `evals/check.ts`):
- `anthropic/claude-sonnet-4-6`
- `deepseek/deepseek-chat-v3:free`

### Manual evals (rubric)

For `scaffold-test` and `heal-test` (can't run headless), score each invocation against `evals/manual-rubric.md`. Record yes/no per checklist item; only all-yes counts as pass.

### Scorecards

`evals/results/<date>.md` — one scorecard per measurement run. Tracks structural pass rate and latency. See `evals/results/2026-05-28.md` for the first one.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `AI_API_KEY env var required` | Headless mode without key | `export AI_API_KEY=...` |
| `run-cli only supports plan-tests and triage-failures in v0` | Tried to headless-invoke `scaffold-test` or `heal-test` | Use Claude Code interactive mode |
| heal-test JSON validation fails | Schema uses draft 2020-12 | Use `require('ajv/dist/2020')` not bare `require('ajv')` |
| `Cannot find module 'ts-morph'` | `npm install` not run after pull | `npm install` (or `yarn install`) |
| `apply-patch` says `selectorId "X" not found` | The patch's `selectorId` doesn't match any `this.X = healable(...)` field in the constructor | Check the page object — the field name must match exactly |
| Generated spec has raw `page.locator(...)` | Skill prompt drift or model regression | Open `.claude/skills/scaffold-test.md`, tighten the convention reminder, re-run |
| `expected.json` row classifications mismatch on triage | Model misread the JUnit XML | Iterate `.claude/skills/triage-failures.md` with more pattern examples |

---

## Extending the workflow

**Adding a new skill.** Drop a markdown file under `.claude/skills/<name>.md` with frontmatter `name`, `description`, `mcps`. Body is the prompt. Claude Code picks it up next session.

**Adding a new headless skill.** Update `agents/run-cli.ts` to allow the new skill name. Make sure the skill is pure text-in/text-out — no Playwright MCP, no file-system mutation.

**Adding a new eval case.** Create `evals/<skill>/cases/<case-id>/input/<file>` and `expected.json`. Update `evals/check.ts`'s `cases` array.

**Adding a new model.** Edit `evals/check.ts`'s `models` array. Run `npm run eval` to score it.

---

## Design constraints worth knowing

- **Page objects own selectors.** Specs never call `page.locator` directly. This is the lock-in that makes `heal-test` automatic — the agent only edits page objects, never test files.
- **`HealableLocator` only iterates fallbacks on action methods** (`click`, `fill`, `textContent`). `.primary_locator` bypasses the chain. If you want a test to exercise the fallback path, use an action method.
- **Heal-test never edits the primary.** Drift in the primary is intentional information for humans; widening the fallback net is the agent's job. If primaries keep going stale, that's a signal to refactor the page object.
- **Run-cli is intentionally minimal.** No retries, no caching, no streaming. It's a one-shot chat completion wrapper for evals and CI. For interactive use, Claude Code is the real surface.
