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
