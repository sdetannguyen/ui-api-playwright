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
2. For each failed test (`<failure>` or `<error>` child of `<testcase>`):
   - Read the failure message and stack trace.
   - Classify using heuristics:
     - `flaky` — timeout on visible element, intermittent network, race condition language.
     - `real-bug` — explicit assertion mismatch, deterministic stack trace, value comparison.
     - `env` — connection refused, DNS failure, missing env var, container failure.
3. Emit the markdown table per the **strict format below**.

## Output format (NON-NEGOTIABLE)

Output MUST be a single markdown table with **exactly these 4 column headers, in this exact order, using these exact words**:

```
| Test | Classification | Justification | Linked Trace |
```

Rules:

- Column header must be the literal string `Test` (not `Test Case`, not `Test Name`).
- All 4 columns must be present in every row, including the header. Use `n/a` for `Linked Trace` when the JUnit XML does not record a trace path. Never omit the column.
- Classification value must be exactly one of: `flaky`, `real-bug`, `env`. Lowercase, hyphenated as shown.
- Justification is one sentence citing the JUnit message.
- One row per failed test in the XML.
- **No code fences** around the table.
- **No preamble or postamble prose** — the response is the table and nothing else.

## Example output

For a JUnit XML with three failed tests (one timeout, one assertion mismatch, one ECONNREFUSED), the correct output is exactly:

```
| Test | Classification | Justification | Linked Trace |
|---|---|---|---|
| hero heading is visible | flaky | TimeoutError 30000ms exceeded with strict mode violation — race signature. | n/a |
| signup button navigates | real-bug | Assertion mismatch: expected 'Sign up', received 'Register'. | n/a |
| API users list loads | env | FetchError ECONNREFUSED 127.0.0.1:443 — network unreachable. | n/a |
```

(Do not wrap your actual output in fences; the fenced block above is documentation only.)
