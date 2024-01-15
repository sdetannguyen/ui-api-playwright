# ui-api-playwright
Skeleton for ui and api automated tests using Playwright.

Target web apps: 
- https://reqres.in/
- https://practicetestautomation.com/

## How it works

The skeleton/framework built on top of [Playwright](https://playwright.dev/) for both UI & API automated tests. The framework includes fundamental setups such as POM pattern, code style check, pre-commit checks, CI/CD integration, and others.

## Required installation

- [NodeJs](https://nodejs.org/en/download)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/download)

## Local test execution

- Get the source code
```
git clone git@github.com:sdetannguyen/ui-api-playwright.git
```
-  Open the source code using Visual Studio Code (recommended)

- Install and download required dependencies 

```
yarn install
```

- Install Playwright browsers

```
npx playwright install --with-deps
```

- Run all tests 

```
npx playwright test
```

- Run a specific test

```
npx playwright test <test_file_name> 

For example: npx playwright test ui-test-reqres-website.spec.ts
```

## Test result/report

- Local test result (.html based)

```
./playwright-report
```
![local report](/images/local-report.png)
- CircleCI test result
```
https://app.circleci.com/pipelines/circleci/A7zoNNQPBzhhmFqo1sbXXm
```
![remote report](/images/remote-report.png)

## Remote test execution workflow
```
New Branch > Circle CI Auto-Started
```

```
New PR > Circle CI > Github Action (GHA) -> All Passed -> Merge Permission Granted
```
```
New PR > Circle CI > Github Action (GHA) -> Failed -> Merge Permission Denied
```
