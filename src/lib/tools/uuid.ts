export function generateUuids(count: number): string[] {
  const n = Math.max(1, Math.min(count, 1000))
  return Array.from({ length: n }, () => crypto.randomUUID())
}

export function toCSV(uuids: string[]): string {
  return 'uuid\n' + uuids.join('\n')
}
