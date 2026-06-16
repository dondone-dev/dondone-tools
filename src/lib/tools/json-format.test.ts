import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson, unescapeAndFormatJson } from './json-format'

describe('formatJson', () => {
  it('pretty-prints valid JSON', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('throws on invalid JSON', () => {
    expect(() => formatJson('not json')).toThrow()
  })
})

describe('minifyJson', () => {
  it('compresses JSON to a single line', () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
  })
})

describe('unescapeAndFormatJson', () => {
  it('unescapes escaped-quote JSON body (no outer quotes)', () => {
    // {\\"a\\":1} in source = {\"a\":1} as literal chars (backslash + quote)
    const input = '{\\"a\\":1,\\"b\\":\\"hello\\"}'
    expect(unescapeAndFormatJson(input)).toBe('{\n  "a": 1,\n  "b": "hello"\n}')
  })

  it('unwraps a JSON-encoded string wrapper', () => {
    // "{\"a\":1}" with all literal chars — outer " are not escaped
    const input = '"{\\"a\\":1}"'
    expect(unescapeAndFormatJson(input)).toBe('{\n  "a": 1\n}')
  })

  it('decodes \\uXXXX unicode escapes inside values', () => {
    // & is the literal 6-char sequence; JSON.parse converts it to &
    const input = '{\\"url\\":\\"https://x.com?a=1\\u0026b=2\\"}'
    expect(JSON.parse(unescapeAndFormatJson(input)).url).toBe('https://x.com?a=1&b=2')
  })

  it('formats already-valid JSON without modification', () => {
    expect(unescapeAndFormatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('throws on input that cannot be converted to valid JSON', () => {
    expect(() => unescapeAndFormatJson('not json at all')).toThrow()
  })
})
