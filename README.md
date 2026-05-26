# ui-api-playwright

A Playwright-based test automation framework for UI and API tests, structured around three explicit layers: infrastructure, abstraction, and test.

---

## Framework Design

### Three-Layer Architecture

```
infrastructure/       ← Layer 1: environment concerns
lib/
  ui/                 ← Layer 2: UI page objects
  api/                ← Layer 2: typed API clients
  fixtures/           ← Layer 2: shared fixtures
tests/
  setup/              ← Layer 3: auth state setup
  ui/                 ← Layer 3: UI specs
  api/                ← Layer 3: API specs
```

### Layer 1 — Infrastructure

Owns all environment concerns. Nothing in the test layer should know where it's running.

| File | Responsibility |
|---|---|
| `infrastructure/env.config.ts` | Base URLs, CI flag, environment-specific config |
| `infrastructure/credentials.ts` | Auth credentials — read from env vars, fall back to defaults |

Config values are read once here and imported wherever needed. To point the framework at a different environment, set the relevant env var — no test file changes required.

### Layer 2 — Abstraction

This is where the engineering depth lives. Tests never touch raw locators or raw HTTP calls.

**UI — Page Objects** (`lib/ui/`)

Each page object extends `BasePage` and encapsulates all selectors and interactions for that page. A test imports a page object from a fixture — it never instantiates one directly and never touches a `Locator`.

```
lib/ui/
  BasePage.ts                     ← abstract base; defines goto()
  ReqresHomePage.ts
  PracticeAutomationLoginPage.ts
  GeeksForGeeksHomePage.ts
```

**API — Typed Service Clients** (`lib/api/`)

API clients wrap Playwright's built-in `request` context with a typed method interface. Tests call `jsonPlaceholderApi.getUser(2)` — not `request.get('/users/2')`. Each client receives its own base URL via constructor injection, so multiple services can coexist without a shared global `baseURL`. Response shapes are typed so assertion errors surface at compile time.

```
lib/api/
  JsonPlaceholderApiClient.ts     ← typed client over @playwright/test request context
```

**Fixtures** (`lib/fixtures/`)

Fixtures wire page objects and API clients into Playwright's test context. Tests destructure what they need — `{ reqresHome }` or `{ jsonPlaceholderApi }` — with no setup boilerplate.

```
lib/fixtures/
  pages.fixture.ts                ← extends base test with page + API fixtures
  index.ts                        ← single import point for all tests
```

### Layer 3 — Tests

Intentionally thin. A test reads like a specification: arrange, act, assert. If a test file is growing complex, it's a signal that logic belongs in the abstraction layer.

```
tests/
  setup/auth.setup.ts             ← saves auth storage state before the suite runs
  ui/reqres-home.spec.ts
  api/jsonplaceholder-users.spec.ts
```

Tests import only from `lib/fixtures` — never directly from page objects or API clients.

```typescript
// tests/api/jsonplaceholder-users.spec.ts
import { test, expect } from '../../lib/fixtures'

test('GET /users/:id returns the correct user', async ({ jsonPlaceholderApi }) => {
  const user = await jsonPlaceholderApi.getUser(2)

  expect(user.id).toBe(2)
  expect(user.email).toBeTruthy()
})
```

### Design Rationale

The main driver was long-term maintainability and team adoption. When the stack changes — a selector changes, an API endpoint moves — you fix it in one place in the abstraction layer. When a new developer joins, they can write their first test in a day without needing to understand the full framework internals.

---

## Target Applications

| Application | Used for |
|---|---|
| [reqres.in](https://reqres.in) | UI test target (homepage) |
| [jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com) | API test target (users resource) |
| [practicetestautomation.com](https://practicetestautomation.com) | Auth setup (login flow) |

---

## Prerequisites

- [Node.js](https://nodejs.org/en/download)
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/download) (recommended)

---

## Local Setup

**1. Clone the repo**
```bash
git clone git@github.com:sdetannguyen/ui-api-playwright.git
cd ui-api-playwright
```

**2. Install dependencies**
```bash
npm install
```

**3. Install Playwright browsers**
```bash
npx playwright install --with-deps
```

**4. Run all tests**
```bash
npx playwright test
```

**5. Run headed (watch the browser)**
```bash
npx playwright test --headed
```

**6. Run a specific test file**
```bash
npx playwright test tests/api/reqres-users.spec.ts
```

**7. Run only UI or only API tests**
```bash
npx playwright test tests/ui/
npx playwright test tests/api/
```

---

## Environment Variables

All defaults work out of the box for local runs. Override via env vars for different environments.

| Variable | Default | Description |
|---|---|---|
| `JSON_PLACEHOLDER_URL` | `https://jsonplaceholder.typicode.com` | Base URL for the JsonPlaceholder API client |
| `REQRES_URL` | `https://reqres.in` | reqres.in homepage for UI tests |
| `PRACTICE_AUTOMATION_URL` | `https://practicetestautomation.com` | Auth setup target |
| `PRACTICE_USERNAME` | `student` | Login username |
| `PRACTICE_PASSWORD` | `Password123` | Login password |

---

## Test Reports

**Local** — HTML report generated after each run:
```bash
npx playwright show-report
```
![local report](/images/local-report.png)

**CI** — CircleCI stores both JUnit results and the HTML artifact:
```
https://app.circleci.com/pipelines/circleci/A7zoNNQPBzhhmFqo1sbXXm
```
![remote report](/images/remote-report.png)

---

## CI/CD

| Trigger | Pipeline |
|---|---|
| Push to any branch | CircleCI runs the full test suite |
| Pull request | CircleCI + GitHub Actions must pass before merge is allowed |

```
Push branch     → CircleCI auto-starts
Open PR         → CircleCI + GitHub Actions → all pass → merge allowed
                                             → any fail → merge blocked
```
