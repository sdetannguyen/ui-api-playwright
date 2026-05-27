/**
 * Pure-fn strategy: given a primary locator expression as a string,
 * return zero or more alternative locator-expression strings that
 * relax assumptions about exact name match.
 */
export function domHeuristicCandidates(primaryExpr: string): string[] {
  const out: string[] = []

  const roleMatch = primaryExpr.match(
    /^page\.getByRole\((['"])([^'"]+)\1,\s*\{\s*name:\s*(['"])([^'"]+)\3\s*\}\s*\)$/,
  )
  if (roleMatch) {
    const [, , role, , name] = roleMatch
    const safe = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out.push(`page.getByRole('${role}', { name: /${safe}/i })`)
  }

  const textMatch = primaryExpr.match(/^page\.getByText\((['"])([^'"]+)\1\)$/)
  if (textMatch) {
    const [, , txt] = textMatch
    const safe = txt.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out.push(`page.getByText(/${safe}/i)`)
  }

  return out
}
