export const WARN_BYTES = 200 * 1024 * 1024
export const MAX_BYTES = 500 * 1024 * 1024

export interface ZipEntry {
  path: string
  name: string
  isDir: boolean
  depth: number
  size: number
  compressedSize: number
  ratio: number
}

export interface ParsedZip {
  entries: ZipEntry[]
  fileCount: number
  dirCount: number
  totalSize: number
  totalCompressedSize: number
  overallRatio: number
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, i)
  return `${i === 0 ? String(val) : val.toFixed(1)} ${units[i]}`
}

interface ZipEntryData {
  compressedSize?: number
  uncompressedSize?: number
}

export async function parseZip(file: File): Promise<ParsedZip> {
  const { default: JSZip } = await import('jszip')
  const zip = await new JSZip().loadAsync(file)

  const raw: ZipEntry[] = []

  zip.forEach((relativePath, zipEntry) => {
    // _data holds Central Directory metadata — no decompression needed
    const data = (zipEntry as { _data?: ZipEntryData })._data
    const size: number = data?.uncompressedSize ?? 0
    const compressedSize: number = data?.compressedSize ?? 0
    const ratio = size > 0 ? Math.round((1 - compressedSize / size) * 100) : 0

    const cleanPath = relativePath.endsWith('/') ? relativePath.slice(0, -1) : relativePath
    const segments = cleanPath.split('/')
    const depth = segments.length - 1
    const name = segments[segments.length - 1] ?? cleanPath

    raw.push({ path: relativePath, name, isDir: zipEntry.dir, depth, size, compressedSize, ratio })
  })

  const sorted = buildSortedEntries(raw)
  const files = sorted.filter(e => !e.isDir)
  const dirs = sorted.filter(e => e.isDir)
  const totalSize = files.reduce((s, e) => s + e.size, 0)
  const totalCompressedSize = files.reduce((s, e) => s + e.compressedSize, 0)
  const overallRatio = totalSize > 0 ? Math.round((1 - totalCompressedSize / totalSize) * 100) : 0

  return { entries: sorted, fileCount: files.length, dirCount: dirs.length, totalSize, totalCompressedSize, overallRatio }
}

export function buildSortedEntries(entries: ZipEntry[]): ZipEntry[] {
  const byParent = new Map<string, ZipEntry[]>()

  for (const entry of entries) {
    const cleanPath = entry.isDir ? entry.path.slice(0, -1) : entry.path
    const segments = cleanPath.split('/')
    segments.pop()
    const parentPath = segments.length === 0 ? '' : segments.join('/') + '/'

    if (!byParent.has(parentPath)) byParent.set(parentPath, [])
    byParent.get(parentPath)!.push(entry)
  }

  for (const children of byParent.values()) {
    children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  const result: ZipEntry[] = []

  function visit(parentPath: string) {
    for (const child of byParent.get(parentPath) ?? []) {
      result.push(child)
      if (child.isDir) visit(child.path)
    }
  }
  visit('')

  // Catch orphaned entries from ZIPs that omit explicit dir entries
  const visited = new Set(result.map(e => e.path))
  for (const entry of entries) {
    if (!visited.has(entry.path)) result.push(entry)
  }

  return result
}

export function getVisibleEntries(entries: ZipEntry[], expandedDirs: Set<string>, filter: string): ZipEntry[] {
  if (filter) {
    const lower = filter.toLowerCase()
    return entries.filter(e => e.path.toLowerCase().includes(lower))
  }

  // Only explicit dir entries can be collapsed; implied dirs (ZIP omits entry) are always open
  const realDirs = new Set(entries.filter(e => e.isDir).map(e => e.path))

  return entries.filter(e => {
    if (e.depth === 0) return true
    const cleanPath = e.isDir ? e.path.slice(0, -1) : e.path
    const segments = cleanPath.split('/')
    let ancestor = ''
    for (let i = 0; i < segments.length - 1; i++) {
      ancestor = ancestor ? `${ancestor}${segments[i]}/` : `${segments[i]}/`
      if (realDirs.has(ancestor) && !expandedDirs.has(ancestor)) return false
    }
    return true
  })
}
