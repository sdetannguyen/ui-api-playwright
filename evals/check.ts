import * as fs from 'fs'
import * as path from 'path'

interface Result {
  skill: string
  mode: string
  model: string
  case: string
  pass: boolean
  failures: string[]
  latencyMs: number
}

function checkPlanTests(actual: string, expected: any): string[] {
  const failures: string[] = []
  for (const section of expected.structural.requiredSections) {
    if (!actual.includes(section)) failures.push(`missing section: ${section}`)
  }
  if (expected.structural.sectionsInOrder) {
    const idxs = expected.structural.requiredSections.map((s: string) => actual.indexOf(s))
    for (let i = 1; i < idxs.length; i++) {
      if (idxs[i] < idxs[i - 1]) failures.push('sections out of order')
    }
  }
  const cols = expected.structural.tableColumns as string[]
  if (cols.some((c) => !actual.includes(c))) failures.push('table columns missing')
  // Naive case count: number of "| T" occurrences.
  const caseRows = (actual.match(/\n\|\s*T\d+\s*\|/g) || []).length
  if (caseRows < expected.structural.minProposedCases) {
    failures.push(`fewer than ${expected.structural.minProposedCases} proposed cases (got ${caseRows})`)
  }
  return failures
}

function checkTriageFailures(actual: string, expected: any): string[] {
  const failures: string[] = []
  const cols = expected.structural.columns as string[]
  if (cols.some((c) => !actual.includes(c))) failures.push('columns missing')
  const rowCount = (actual.match(/^\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|\s*$/gm) || []).length - 1 // subtract header
  if (rowCount < expected.structural.rowCount) {
    failures.push(`fewer than ${expected.structural.rowCount} rows (got ${rowCount})`)
  }
  for (const [testName, expectedClass] of Object.entries(expected.byRow)) {
    const re = new RegExp(`\\b${testName.replace(/[.*+?^${}()|[\\]/g, '\\$&')}\\b[\\s\\S]*?\\b(${expected.structural.allowedClassifications.join('|')})\\b`)
    const m = actual.match(re)
    if (!m || m[1] !== expectedClass) failures.push(`row "${testName}": expected ${expectedClass}, got ${m?.[1] ?? 'unknown'}`)
  }
  return failures
}

async function runCli(skill: string, inputPath: string, model: string): Promise<{ output: string; ms: number }> {
  const { spawnSync } = require('child_process')
  const start = Date.now()
  const res = spawnSync('npx', ['ts-node', 'agents/run-cli.ts', skill, inputPath], {
    env: { ...process.env, AI_MODEL: model },
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  const ms = Date.now() - start
  if (res.status !== 0) {
    throw new Error(`run-cli failed: ${res.stderr}`)
  }
  return { output: res.stdout, ms }
}

async function main() {
  const results: Result[] = []
  const models = ['anthropic/claude-3-haiku', 'meta-llama/llama-3.3-70b-instruct:free']
  const cases = [
    { skill: 'plan-tests', dir: 'evals/plan-tests/cases/example-1', input: 'evals/plan-tests/cases/example-1/input/story.md', checker: checkPlanTests },
    { skill: 'triage-failures', dir: 'evals/triage-failures/cases/example-1', input: 'evals/triage-failures/cases/example-1/input/junit.xml', checker: checkTriageFailures },
  ]
  for (const c of cases) {
    const expected = JSON.parse(fs.readFileSync(path.join(c.dir, 'expected.json'), 'utf8'))
    for (const model of models) {
      try {
        const { output, ms } = await runCli(c.skill, c.input, model)
        const failures = c.checker(output, expected)
        results.push({
          skill: c.skill,
          mode: 'run-cli',
          model,
          case: 'example-1',
          pass: failures.length === 0,
          failures,
          latencyMs: ms,
        })
      } catch (e: any) {
        results.push({
          skill: c.skill,
          mode: 'run-cli',
          model,
          case: 'example-1',
          pass: false,
          failures: [`run-cli error: ${e.message}`],
          latencyMs: -1,
        })
      }
    }
  }
  console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
