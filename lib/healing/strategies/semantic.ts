export function semanticCandidates(primaryExpr: string): string[] {
  const out: string[] = []

  const headingMatch = primaryExpr.match(
    /^page\.getByRole\((['"])heading\1,\s*\{\s*name:\s*(['"])([^'"]+)\2\s*\}\s*\)$/,
  )
  if (headingMatch) {
    out.push("page.locator('h1, h2, h3').first()")
  }

  const buttonMatch = primaryExpr.match(
    /^page\.getByRole\((['"])button\1,\s*\{\s*name:\s*(['"])([^'"]+)\2\s*\}\s*\)$/,
  )
  if (buttonMatch) {
    const [, , , name] = buttonMatch
    const words = name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2)
    if (words.length > 0) {
      const alt = words.join('|')
      out.push(`page.locator('button', { hasText: /${alt}/i })`)
    }
  }

  return out
}
