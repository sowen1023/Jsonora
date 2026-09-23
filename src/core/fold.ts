/** Matching multi-line JSON container ends, indexed by the line where each container opens. */
export function foldableLineEnds(lines: readonly string[]): number[] {
  const ends = new Array<number>(lines.length).fill(-1)
  const stack: Array<{ bracket: '{' | '['; line: number }> = []
  let blockComment = false

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row]
    let quote: '"' | "'" | null = null

    for (let column = 0; column < line.length; column++) {
      const char = line[column]
      const next = line[column + 1]

      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false
          column++
        }
        continue
      }
      if (quote) {
        if (char === '\\') column++
        else if (char === quote) quote = null
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
      } else if (char === '/' && next === '/') {
        break
      } else if (char === '/' && next === '*') {
        blockComment = true
        column++
      } else if (char === '{' || char === '[') {
        stack.push({ bracket: char, line: row })
      } else if (char === '}' || char === ']') {
        const opening = stack[stack.length - 1]
        if (!opening || (opening.bracket === '{' ? char !== '}' : char !== ']')) continue
        stack.pop()
        if (opening.line < row) ends[opening.line] = Math.max(ends[opening.line], row)
      }
    }
  }

  return ends
}

/** Source line indices after collapsed containers have been removed from the display. */
export function visibleLineIndices(lineCount: number, ends: readonly number[], collapsed: ReadonlySet<number>): number[] {
  const visible: number[] = []
  for (let row = 0; row < lineCount; row++) {
    visible.push(row)
    if (collapsed.has(row) && ends[row] > row) row = ends[row]
  }
  return visible
}
