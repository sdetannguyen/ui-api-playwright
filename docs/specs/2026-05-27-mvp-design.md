# AI-augmented test lifecycle — MVP

> Date: 2026-05-27
> Status: Draft, ready for implementation
> Repo: `ui-api-playwright`

## Goal

Reduce repetitive SDET effort (spec reading, scaffold boilerplate, flaky-selector fixes) by introducing four agent skills with clear input/output contracts. Ship the simplest version that works end-to-end in seven days.

## Non-goals (MVP)

- Building a full multi-MCP runner. Claude Code is the host for all four skills; `run-cli.ts` is a small CLI for two text-only skills (no MCP) — about 150 LOC, not a runner platform.
- Tracker integration (Notion, Jira, GitHub Issues). Story input is a local markdown file in v0.
- PR-automation, CI hooks, GitHub MCP. heal-test prints structured JSON to stdout; the human runs the applier.
- Telemetry stream, input-hash cache, budget caps in code. Claude Code shows cost natively; run-cli relies on the model provider's own usage page.
- Vision-based healing. DOM-heuristic + semantic fallbacks only.
- Behavioural eval beyond snapshot fixtures; LLM-as-judge scoring. Structural eval is the v0 gate.

## Host and invocation

Two invocation modes coexist in v0, each serving a different use case:

### Mode 1 — Interactive (Claude Code)

The daily driver for development. Skills live at `.claude/skills/<name>.md`. MCP servers (filesystem, Playwright) are configured in `.mcp.json` at repo root. A developer opens Claude Code and types `/plan-tests path/to/story.md` (or similar) — Claude Code loads the skill, runs the tool-use loop, and streams output to the terminal. We do not re-implement the loop, the MCP client, or cost accounting.

All four skills work in interactive mode.

### Mode 2 — CLI (text-in / text-out skills only)

`agents/run-cli.ts` (~150 LOC) is a small headless runner for the two skills whose I/O is purely text-based: **plan-tests** and **triage-failures**. It loads a SKILL.md prompt, calls a configurable LLM via OpenAI-compatible API (default: OpenRouter DeepSeek V3 free), and prints the result to stdout. No MCP, no tools — the runner reads the input file from a CLI arg and passes its contents into the prompt as context.

This mode powers the scorecard and any future CI hook. `scaffold-test` and `heal-test` need real MCP tool use (filesystem writes, browser driving) and remain Claude Code only in v0.

### What the scorecard reports

| Skill | Mode | Scorecard automation |
|---|---|---|
| plan-tests | both | automated via run-cli |
| triage-failures | both | automated via run-cli |
| scaffold-test | Claude Code only | manual: invoke skill, capture output, record structural pass/fail by hand |
| heal-test | Claude Code only | manual: same |

The scorecard explicitly marks which rows are manual. This is honest about MVP limits and frames the v1 work (full multi-MCP runner) as the natural next step.

## MCPs (v0)

| MCP | Purpose | Auth |
|---|---|---|
| Filesystem (Anthropic official) | read/write repo files | none |
| Playwright (Microsoft official) | drive a browser for heal-test | none |

That is the whole set. Notion, Figma, GitHub are deferred.

## Skills

### Output format contracts come before prompts

Each skill has an **output format contract** committed before any prompt is written. The contract is the source of truth that every downstream consumer reads — the SKILL.md prompt references it (and includes a worked example for few-shot), the eval harness asserts against it, and the next skill in the pipeline parses it. Locking format upfront avoids drift between skills, contradictions between hand-written sample files and agent-produced output, and fragile eval fixtures.

Contracts live in:

- `docs/skills/plan-tests-output-format.md` — required sections (Risk Assessment, Coverage Gap, Proposed Cases) and the Proposed Cases table column schema (ID, Layer (UI|API), Priority (P0|P1|P2), Description)
- `docs/skills/scaffold-test-output-format.md` — generated spec must extend `BasePage`, import only from `lib/fixtures`, no raw `page.locator(...)` in the spec layer; page-object must use `healable(...)` factory for selectors
- `docs/skills/triage-failures-output-format.md` — required columns in the report table (Test, Classification (flaky|real-bug|env), Justification, Linked Trace)
- `agents/skills/heal-test/output-schema.json` — JSON Schema for the structured patch document (see `heal-test` agent section above)

### SKILL.md files

Each skill is one markdown file under `.claude/skills/`. Frontmatter is minimal:

```yaml
---
name: heal-test
description: One-line summary
mcps: [filesystem, playwright]
---

[Prompt body.]
```

### plan-tests

- **Input**: path to a local markdown file describing a feature (story content)
- **MCPs**: filesystem
- **Output**: test plan markdown to stdout
- **Sections required in output**: risk assessment, coverage gap (against existing tests in `tests/`), proposed cases (table with ID, layer, priority, description)

### scaffold-test

- **Input**: path to a plan file produced by plan-tests + case ID (e.g. `T2`)
- **MCPs**: filesystem
- **Output**: writes a test spec file under `tests/ui/` or `tests/api/` and (if needed) a page-object file under `lib/ui/`
- **Discipline**: generated code must extend `BasePage`, import only from `lib/fixtures`, never use raw `page.locator(...)` in the spec layer. The agent runs `npx tsc --noEmit` and `eslint` itself before declaring done; if either fails it retries once.

### heal-test

- **Input**: failed test name + path to screenshot from the test run
- **MCPs**: filesystem, playwright
- **Output**: a structured JSON document to stdout. Example:
  ```json
  {
    "file": "lib/ui/ReqresHomePage.ts",
    "selectorId": "heroHeading",
    "action": "add_fallbacks",
    "fallbacks": [
      "page.getByRole('heading', { name: /real backend/i })",
      "page.locator('h1').first()"
    ],
    "rationale": "Primary selector text changed from 'A real backend' to 'Real backend'. Two fallbacks: role+name regex tolerates copy drift; tag selector tolerates role attribute removal."
  }
  ```
- **Behaviour**: agent uses Playwright MCP to re-navigate the target page, inspect current DOM, then emits the JSON above. Does **not** emit unified diffs — LLM-generated line numbers are unreliable.
- **Applier**: a tiny TypeScript script `agents/apply-patch.ts` (~50 LOC) reads the JSON, parses the named page-object file with ts-morph, locates the matching `healable(...)` call by `selectorId`, and inserts the fallback expressions into the array. After applying, it runs `git diff` so the human reviews a real unified diff before staging.

### triage-failures

- **Input**: path to a JUnit XML file from a CI run
- **MCPs**: filesystem
- **Output**: classification report markdown to stdout. Each failed test classified as `flaky` / `real-bug` / `env-issue` with a one-line justification.

## HealableLocator (Tier 2 addition)

Add `lib/healing/HealableLocator.ts` and refactor existing page objects to opt in. Minimal API:

```typescript
healable(primary: Locator, fallbacks: Locator[]): HealableLocator
```

Wrapped methods (v0): `click`, `fill`, `textContent`. Three is enough to demo.

Behaviour:
- Primary first with Playwright's default 30s auto-wait
- On primary failure, try each fallback in order with a 3s timeout each
- Wrapped methods only; `expect(locator).toBeVisible()` and other assertions use the primary

No vision, no policy, no telemetry file. Roughly 80 LOC plus a unit test.

Migration: two page objects opt in during MVP — `ReqresHomePage` and `PracticeAutomationLoginPage`. During migration, `ReqresHomePage` gains one or two additional selectors (e.g. a nav link and a footer element) so that heal-test eval has selector variety on a single page. `PracticeAutomationLoginPage` already has three selectors (username, password, submit) and covers form-input variety. `PlaywrightHomePage` is left on raw `Locator` for v0 — it tests an upstream-controlled site that drifts often.

## Evals (v0)

Structural only. Single command: `npm run eval`.

For each skill, a fixture folder under `evals/<skill>/cases/`:
- `input/` — the input file(s)
- `expected.json` — the structural checks to assert (presence of required sections, type-check pass, no raw `page.locator` in scaffolded specs, etc.)

The scorecard is one markdown file under `evals/results/<date>.md`:

| Skill | Model | Cases | Structural pass | Latency p50 |
|---|---|---|---|---|

The DeepSeek row exists to demonstrate the gap between paid baseline and free alternative — not as a quality gate.

## Day-by-day plan

Seven days of focused work plus one optional day. Days 5–6 carry ~1h overhead each for README and scorecard prep so Day 7 can focus on run-cli, eval automation, and the demo recording.


| Day | Deliverable | Verification |
|---|---|---|
| 1 | output-format contracts written **first**: `docs/skills/plan-tests-output-format.md`, `docs/skills/scaffold-test-output-format.md`, `docs/skills/triage-failures-output-format.md`, `agents/skills/heal-test/output-schema.json`. Then `.claude/skills/{plan,scaffold,heal,triage}.md` (each prompt references its format contract). `.mcp.json` for filesystem + playwright. One sample story md, one sample plan md (hand-written to conform to its format contract), one sample JUnit XML | each skill invocable in Claude Code; stdout shows output that conforms to its format contract |
| 2 | `lib/healing/HealableLocator.ts` (~80 LOC) + unit tests covering two DOM-change scenarios; migrate `ReqresHomePage` and `PracticeAutomationLoginPage` to `healable()`; add 1–2 new selectors to `ReqresHomePage` during migration | unit tests green; both migrated page objects' spec files still pass |
| 3 | `plan-tests` works on the sample story md → real plan output | manual review of one plan |
| 4 | `scaffold-test` works on a plan → writes a real spec file that passes `tsc` and `eslint` | both commands green; the written test passes |
| 5 | `agents/apply-patch.ts` (~50 LOC, ts-morph-based); three HTML snapshot fixtures under `evals/heal-test/fixtures/*.html` (renamed-attribute, reordered-children, removed-element); live-run demo case: break one `ReqresHomePage` selector, run heal-test, apply JSON via applier, view resulting `git diff`, confirm test green. **+1h overhead: draft `README.md` skeleton** with section headers for AI workflows | applier runs cleanly on all three snapshots; live demo cycle works end-to-end; README skeleton committed |
| 6 | `triage-failures` works on a sample JUnit XML containing engineered flake / real-bug / env failures → classifies each correctly. **+1.5h overhead: scorecard template at `evals/results/<date>.md` with one row hand-filled; flesh out README content** for the AI workflows section | manual spot-check on triage; scorecard template renders; README readable end-to-end |
| 7 | `agents/run-cli.ts` (~150 LOC) running plan-tests + triage-failures against OpenRouter DeepSeek free; structural eval logic; finalise scorecard (2 automated + 2 manual rows); record an asciinema cast (60–90s) embedded in README; polish README copy | run-cli produces stdout against both skills; scorecard fully populated; asciinema cast embedded |
| 8 (optional) | Re-record demo with voice-over (Loom or OBS) as 3-minute YouTube unlisted video. Only if Day 7 ran clean. | video link added to README |

## Demo narrative

> *"I started this Playwright framework in late 2023 as a personal sandbox. In May 2026 I consolidated it into a three-tier layout. The next chapter is the AI-augmented lifecycle — four agent skills that handle the boilerplate I kept doing by hand. I chose Claude Code as the host instead of building a runner, so the engineering effort went into HealableLocator and the eval harness. A future version adds a pluggable tracker, multi-provider runner, and PR auto-comment — those are documented in this spec and a follow-up."*

The narrative is anchored to actual git history (repo began December 2023, consolidation visible in May 2026 commits, AI work is the next chapter).

## Risks (MVP-sized)

Seven risks, ranked by impact on shipping the demo end-to-end.

1. **`ts-morph` applier cannot locate the `healable(...)` call** (e.g. dynamic property name, constructor logic, conditional assignment). Without it, Day 5's live demo cycle breaks.
   - *Mitigation*: applier requires `selectorId` to match a constructor-assigned property whose initialiser is a literal `healable()` call. Anything else → applier prints `manual apply required` and exits non-zero. Document this as a page-object convention in `docs/skills/scaffold-test-output-format.md` so scaffold-generated objects always meet it.

2. **DeepSeek free output drifts from the format contracts.** If structural eval fails on every DeepSeek row, the scorecard tells a flat story.
   - *Mitigation*: each SKILL.md prompt includes a worked example (few-shot) conforming to its format contract. The scorecard is allowed to show a gap; that gap is the story, not the failure.

3. **Format contract and SKILL.md prompt fall out of sync** as we iterate during Days 3–6.
   - *Mitigation*: SKILL.md prompts reference the contract by path and include only the worked example inline. A single canonical sample committed to `evals/<skill>/cases/example-1/` is the conformance reference; eval CI loads it.

4. **HealableLocator over-fits the snapshot fixtures.** Tests pass on three engineered DOM shapes but a real upstream rebrand still breaks the live demo.
   - *Mitigation*: two unit tests covering distinct DOM-change patterns (renamed attribute and reordered children), plus one live-run case against the migrated `ReqresHomePage`. Three independent signals.

5. **Day 1 is workload-heavy** (4 format contracts + 4 SKILL.md + samples + `.mcp.json` + repo bootstrap). Slipping Day 1 ripples through everything.
   - *Mitigation*: if Day 1 overruns, drop the optional Day 8 (re-recorded video) first. If still tight, ship only the first sample fixture; samples 2 and 3 can be generated by the agent on Days 3–4 and committed retroactively.

6. **Manual scorecard rows for scaffold-test and heal-test are subjective.** Self-graded results can read as marketing.
   - *Mitigation*: a pre-written rubric at `evals/manual-rubric.md` lists yes/no structural checks per skill. Manual rows record rubric outcomes, not impressions. The rubric is the engineering artefact; the score follows from it.

7. **Live SUTs (reqres.in, practicetestautomation.com) may rebrand or go offline during the build week.** Live demo and any spec hitting these would break.
   - *Mitigation*: snapshot fixtures cover the heal-test eval. For live demo of the framework, any opt-in SUT in the repo is acceptable; record once and embed.
