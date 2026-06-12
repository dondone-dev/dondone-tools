export function encodeUrl(input: string): string {
  if (!input) throw new Error('Input is empty')
  return encodeURIComponent(input)
}

export function decodeUrl(input: string): string {
  if (!input) throw new Error('Input is empty')
  return decodeURIComponent(input)
}
