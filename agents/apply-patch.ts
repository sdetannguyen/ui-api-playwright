import { Project, SyntaxKind } from 'ts-morph'
import * as fs from 'fs'

export interface PatchDocument {
  file: string
  selectorId: string
  action: 'add_fallbacks'
  fallbacks: string[]
  rationale: string
}

export function applyPatch(patch: PatchDocument): void {
  if (patch.action !== 'add_fallbacks') {
    throw new Error(`Unsupported action: ${patch.action}`)
  }

  const project = new Project({ useInMemoryFileSystem: false })
  const source = project.addSourceFileAtPath(patch.file)

  const cls = source.getClasses()[0]
  if (!cls) {
    throw new Error(`selectorId "${patch.selectorId}" not found: no class in ${patch.file}`)
  }

  const ctor = cls.getConstructors()[0]
  if (!ctor) {
    throw new Error(`selectorId "${patch.selectorId}" not found: no constructor in ${patch.file}`)
  }

  const assignment = ctor.getDescendantsOfKind(SyntaxKind.BinaryExpression).find((expr) => {
    const left = expr.getLeft().getText()
    if (left !== `this.${patch.selectorId}`) return false
    const right = expr.getRight().getText()
    return right.startsWith('healable(')
  })

  if (!assignment) {
    throw new Error(`selectorId "${patch.selectorId}" not found as a constructor-literal healable() assignment in ${patch.file}`)
  }

  const healableCall = assignment.getRight().asKindOrThrow(SyntaxKind.CallExpression)
  const args = healableCall.getArguments()
  if (args.length !== 2) {
    throw new Error(`healable() must have 2 arguments, got ${args.length}`)
  }
  const arrayLit = args[1].asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
  for (const fb of patch.fallbacks) {
    arrayLit.addElement(fb)
  }

  source.formatText()
  source.saveSync()
}

if (require.main === module) {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error('Usage: ts-node agents/apply-patch.ts <patch.json>')
    process.exit(1)
  }
  const patch = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as PatchDocument
  applyPatch(patch)
  console.log(`Applied patch to ${patch.file}`)
}
