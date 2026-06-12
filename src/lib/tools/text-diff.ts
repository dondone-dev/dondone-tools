import { diffLines, diffWords } from 'diff'

export type ChangeType = 'added' | 'removed' | 'unchanged'

export interface Token {
  text: string
  highlight: boolean
}

export interface DiffSide {
  lineNo: number
  type: ChangeType
  tokens: Token[]
}

export interface SplitRow {
  left: DiffSide | null
  right: DiffSide | null
}

export interface UnifiedLine {
  oldLineNo: number | null
  newLineNo: number | null
  type: ChangeType
  tokens: Token[]
}

export interface DiffResult {
  split: SplitRow[]
  unified: UnifiedLine[]
  addedCount: number
  removedCount: number
}

function splitLines(text: string): string[] {
  if (!text) return []
  const lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

function buildWordTokens(line: string, type: 'removed' | 'added', paired: string): Token[] {
  const changes = type === 'removed' ? diffWords(line, paired) : diffWords(paired, line)
  return changes
    .filter((c) => (type === 'removed' ? !c.added : !c.removed))
    .map((c) => ({
      text: c.value,
      highlight: type === 'removed' ? !!c.removed : !!c.added,
    }))
}

export function computeDiff(original: string, modified: string): DiffResult {
  const split: SplitRow[] = []
  const unified: UnifiedLine[] = []
  let addedCount = 0
  let removedCount = 0
  let oldLineNo = 1
  let newLineNo = 1

  const changes = diffLines(original, modified)
  let i = 0

  while (i < changes.length) {
    const change = changes[i]

    if (!change.added && !change.removed) {
      for (const line of splitLines(change.value)) {
        const lo = oldLineNo++
        const ln = newLineNo++
        const tokens: Token[] = [{ text: line, highlight: false }]
        unified.push({ oldLineNo: lo, newLineNo: ln, type: 'unchanged', tokens })
        split.push({
          left: { lineNo: lo, type: 'unchanged', tokens },
          right: { lineNo: ln, type: 'unchanged', tokens },
        })
      }
      i++
      continue
    }

    // Consecutive removed+added — treat as modification, apply word diff
    if (change.removed && i + 1 < changes.length && changes[i + 1].added) {
      const removedLines = splitLines(change.value)
      const addedLines = splitLines(changes[i + 1].value)
      removedCount += removedLines.length
      addedCount += addedLines.length
      const len = Math.max(removedLines.length, addedLines.length)

      for (let j = 0; j < len; j++) {
        const rLine = removedLines[j]
        const aLine = addedLines[j]

        if (rLine !== undefined && aLine !== undefined) {
          const leftTokens = buildWordTokens(rLine, 'removed', aLine)
          const rightTokens = buildWordTokens(aLine, 'added', rLine)
          const lo = oldLineNo++
          const ln = newLineNo++
          unified.push({ oldLineNo: lo, newLineNo: null, type: 'removed', tokens: leftTokens })
          unified.push({ oldLineNo: null, newLineNo: ln, type: 'added', tokens: rightTokens })
          split.push({
            left: { lineNo: lo, type: 'removed', tokens: leftTokens },
            right: { lineNo: ln, type: 'added', tokens: rightTokens },
          })
        } else if (rLine !== undefined) {
          const lo = oldLineNo++
          const tokens: Token[] = [{ text: rLine, highlight: false }]
          unified.push({ oldLineNo: lo, newLineNo: null, type: 'removed', tokens })
          split.push({ left: { lineNo: lo, type: 'removed', tokens }, right: null })
        } else if (aLine !== undefined) {
          const ln = newLineNo++
          const tokens: Token[] = [{ text: aLine, highlight: false }]
          unified.push({ oldLineNo: null, newLineNo: ln, type: 'added', tokens })
          split.push({ left: null, right: { lineNo: ln, type: 'added', tokens } })
        }
      }
      i += 2
      continue
    }

    if (change.removed) {
      for (const line of splitLines(change.value)) {
        const lo = oldLineNo++
        removedCount++
        const tokens: Token[] = [{ text: line, highlight: false }]
        unified.push({ oldLineNo: lo, newLineNo: null, type: 'removed', tokens })
        split.push({ left: { lineNo: lo, type: 'removed', tokens }, right: null })
      }
      i++
      continue
    }

    if (change.added) {
      for (const line of splitLines(change.value)) {
        const ln = newLineNo++
        addedCount++
        const tokens: Token[] = [{ text: line, highlight: false }]
        unified.push({ oldLineNo: null, newLineNo: ln, type: 'added', tokens })
        split.push({ left: null, right: { lineNo: ln, type: 'added', tokens } })
      }
      i++
      continue
    }

    i++
  }

  return { split, unified, addedCount, removedCount }
}
