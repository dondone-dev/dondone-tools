export function formatJson(input: string, indent = 2): string {
  return JSON.stringify(JSON.parse(input), null, indent)
}

export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input))
}

export function unescapeAndFormatJson(input: string, indent = 2): string {
  const trimmed = input.trim()
  let parsed: unknown
  if (trimmed.startsWith('"')) {
    // JSON-encoded string wrapper e.g. "{\"a\":1}" — unwrap one level first
    parsed = JSON.parse(JSON.parse(trimmed) as string)
  } else {
    // Escaped JSON body e.g. {\"a\":1} — replace \" → " then parse
    parsed = JSON.parse(trimmed.replace(/\\"/g, '"'))
  }
  return JSON.stringify(parsed, null, indent)
}
