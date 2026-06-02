# triage-failures output format

A triage-failures output is one markdown document containing a single markdown table:

| Test | Classification | Justification | Linked Trace |
|---|---|---|---|

- `Test` is the failing test name as it appears in the JUnit XML `<testcase classname>.<name>`.
- `Classification` is one of `flaky`, `real-bug`, `env`.
- `Justification` is one sentence.
- `Linked Trace` is a relative path to the trace file under `test-results/`, or `n/a` if no trace was produced.

The table MUST contain one row per failed test in the input JUnit XML. No other content is required.
