## Risk Assessment
- **Rename race during rotation** — if two test workers write to `.ai/heals.jsonl` simultaneously and both trigger rotation, one rename can clobber data written between the size-check and the rename call.
- **Stat-then-rename TOCTOU** — checking file size and then renaming is not atomic; rapidly appending writers can lose the line written between the two syscalls.
- **Date-collision on rotated filenames** — two rotations within the same calendar day produce identical `.ai/heals.<date>.jsonl` targets; second rename overwrites the first without a counter or timestamp suffix.
- **Threshold misconfiguration** — non-numeric or negative `HEAL_LOG_MAX_MB` should not silently disable rotation, exhaust disk, or crash the test run on every action.
- **Filesystem-permission failures mid-write** — rotation on a read-only or quota-full volume must not deadlock the calling locator action; the heal log is observability, not load-bearing.

## Coverage Gap
- Missing any direct tests for `HealableLocator` telemetry behaviour — `tests/healing/HealableLocator.spec.ts` only asserts primary/fallback runtime behaviour, never inspects the `.ai/heals.jsonl` side effect.
- Adds new lazy-rotation behaviour at write time that does not exist in any current test under `tests/healing/`.
- Missing env-var configuration tests for the healing module — no spec under `tests/` reads or asserts on `HEAL_LOG_MAX_MB`.
- Already covered by `tests/healing/HealableLocator.spec.ts`: the click/fill/textContent happy-path and fallback chain (so telemetry tests can assume the action layer works and focus only on the log file).

## Proposed Cases

| ID | Layer | Priority | Description |
|---|---|---|---|
| T1 | UI | P0 | When `.ai/heals.jsonl` is under the threshold, a single locator action appends one JSON line and does not rename the file. |
| T2 | UI | P0 | When `.ai/heals.jsonl` exceeds `HEAL_LOG_MAX_MB`, the next locator action renames it to `.ai/heals.<YYYY-MM-DD>.jsonl` and starts a new `.ai/heals.jsonl` containing only the new line. |
| T3 | UI | P1 | With `HEAL_LOG_MAX_MB` unset, rotation uses the default of 10 MB (verified by setting the file to 10.1 MB and asserting one rotation occurs). |
| T4 | UI | P1 | A custom `HEAL_LOG_MAX_MB=1` triggers rotation at the configured 1 MB boundary, not the default. |
| T5 | UI | P1 | Two same-day rotations produce distinct files; the second rotation does not overwrite the first (e.g. suffix or counter applied). |
| T6 | UI | P2 | When rotation cannot complete (rename throws EACCES / EROFS), the locator action still succeeds and the error is swallowed without surfacing to the test. |
