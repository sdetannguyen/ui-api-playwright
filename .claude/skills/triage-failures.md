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
