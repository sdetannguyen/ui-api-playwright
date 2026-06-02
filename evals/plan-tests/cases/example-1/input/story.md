# Add a "telemetry rotation" policy to HealableLocator

## Context

`HealableLocator` writes one JSON line per action attempt to `.ai/heals.jsonl`. Over weeks of use this file grows unbounded. We want a rotation policy: when the file exceeds N MB, rename to `.ai/heals.<date>.jsonl` and start a new file.

## Acceptance criteria

- Configurable threshold (env var `HEAL_LOG_MAX_MB`, default 10).
- Rotation happens lazily at write time, not via a background job.
- Rotated files are not deleted automatically; that's a separate retention concern.
- No data loss during rotation (no rename race).
