import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

interface SkillFile {
  meta: { name: string; description: string; mcps: string[] }
  body: string
}

function loadSkill(name: string): SkillFile {
  const filePath = path.join('.claude', 'skills', `${name}.md`)
  const raw = fs.readFileSync(filePath, 'utf8')
  const match = raw.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`Skill ${name} missing frontmatter`)
  const meta = yaml.load(match[1]) as SkillFile['meta']
  return { meta, body: match[2] }
}

function loadInputContents(inputArg: string): string {
  if (inputArg.endsWith('.json')) {
    return JSON.stringify(JSON.parse(fs.readFileSync(inputArg, 'utf8')), null, 2)
  }
  return fs.readFileSync(inputArg, 'utf8')
}

async function main() {
  const [, , skillName, ...rest] = process.argv
  if (!skillName || rest.length === 0) {
    console.error('Usage: ts-node agents/run-cli.ts <skill-name> <input-path> [more-args...]')
    process.exit(1)
  }
  if (skillName !== 'plan-tests' && skillName !== 'triage-failures') {
    console.error(`run-cli only supports plan-tests and triage-failures in v0. Got: ${skillName}`)
    process.exit(2)
  }

  const skill = loadSkill(skillName)
  const inputContents = loadInputContents(rest[0])

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    console.error('AI_API_KEY env var required')
    process.exit(3)
  }
  const baseURL = process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1'
  const model = process.env.AI_MODEL ?? 'deepseek/deepseek-chat-v3:free'

  const client = new OpenAI({ apiKey, baseURL })

  const start = Date.now()
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: skill.body },
      {
        role: 'user',
        content: `Input file contents:\n\n${inputContents}\n\nProduce the output per the skill's contract.`,
      },
    ],
  })
  const ms = Date.now() - start

  const out = response.choices[0]?.message.content ?? ''
  process.stdout.write(out)
  process.stderr.write(`\n[run-cli] model=${model} latency_ms=${ms}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
