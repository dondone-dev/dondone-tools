export type JsonSegment =
  | { kind: 'text'; text: string }
  | { kind: 'key'; text: string; path: string }
  | { kind: 'value'; text: string; path: string }

const PLAIN_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function childPath(parentPath: string, key: string | number): string {
  if (typeof key === 'number') {
    return `${parentPath}[${key}]`
  }
  if (!parentPath) {
    return PLAIN_KEY.test(key) ? key : `["${key}"]`
  }
  return PLAIN_KEY.test(key) ? `${parentPath}.${key}` : `${parentPath}["${key}"]`
}

function indent(depth: number, pretty: boolean): string {
  return pretty ? '  '.repeat(depth) : ''
}

function walk(value: unknown, path: string, depth: number, pretty: boolean, out: JsonSegment[]): void {
  if (value === null || typeof value !== 'object') {
    out.push({ kind: 'value', text: JSON.stringify(value), path: path || '$' })
    return
  }

  const nl = pretty ? '\n' : ''

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push({ kind: 'text', text: '[]' })
      return
    }
    out.push({ kind: 'text', text: '[' + nl })
    value.forEach((item, i) => {
      out.push({ kind: 'text', text: indent(depth + 1, pretty) })
      walk(item, childPath(path, i), depth + 1, pretty, out)
      out.push({ kind: 'text', text: (i < value.length - 1 ? ',' : '') + nl })
    })
    out.push({ kind: 'text', text: indent(depth, pretty) + ']' })
    return
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    out.push({ kind: 'text', text: '{}' })
    return
  }
  out.push({ kind: 'text', text: '{' + nl })
  entries.forEach(([key, val], i) => {
    const p = childPath(path, key)
    out.push({ kind: 'text', text: indent(depth + 1, pretty) })
    out.push({ kind: 'key', text: JSON.stringify(key), path: p })
    out.push({ kind: 'text', text: pretty ? ': ' : ':' })
    walk(val, p, depth + 1, pretty, out)
    out.push({ kind: 'text', text: (i < entries.length - 1 ? ',' : '') + nl })
  })
  out.push({ kind: 'text', text: indent(depth, pretty) + '}' })
}

/**
 * Splits a parsed JSON value into text/key/value segments whose concatenated
 * `text` reproduces JSON.stringify(value, null, pretty ? 2 : undefined) exactly,
 * with each object key and each leaf value tagged with its JSON path.
 */
export function buildJsonSegments(value: unknown, pretty: boolean): JsonSegment[] {
  const segments: JsonSegment[] = []
  walk(value, '', 0, pretty, segments)
  return segments
}
