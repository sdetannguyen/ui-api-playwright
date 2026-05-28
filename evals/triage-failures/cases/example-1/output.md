# triage-failures output — example-1

| Test | Classification | Justification | Linked Trace |
|---|---|---|---|
| hero heading is visible | flaky | Timeout 30000ms exceeded waiting for getByRole heading with strict mode violation — classic flaky timeout/race signature. | n/a |
| signup button navigates | real-bug | Deterministic assertion mismatch: expect(received).toBe(expected) Expected 'Sign up' Received 'Register'. | n/a |
| API users list loads | env | FetchError: connect ECONNREFUSED 127.0.0.1:443 — network/service unavailable, environment-level failure. | n/a |
