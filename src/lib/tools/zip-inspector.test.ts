import { describe, expect, it } from 'vitest'
import { buildSortedEntries, formatBytes, getVisibleEntries, type ZipEntry } from './zip-inspector'

function entry(path: string, isDir: boolean, size = 100, compressedSize = 50): ZipEntry {
  const cleanPath = isDir ? path.slice(0, -1) : path
  const segments = cleanPath.split('/')
  return {
    path,
    name: segments[segments.length - 1],
    isDir,
    depth: segments.length - 1,
    size,
    compressedSize,
    ratio: size > 0 ? Math.round((1 - compressedSize / size) * 100) : 0,
  }
}

describe('formatBytes', () => {
  it('formats zero', () => expect(formatBytes(0)).toBe('0 B'))
  it('formats bytes', () => expect(formatBytes(512)).toBe('512 B'))
  it('formats kilobytes', () => expect(formatBytes(1536)).toBe('1.5 KB'))
  it('formats megabytes', () => expect(formatBytes(1024 * 1024)).toBe('1.0 MB'))
  it('formats gigabytes', () => expect(formatBytes(1024 ** 3)).toBe('1.0 GB'))
})

describe('buildSortedEntries', () => {
  it('places dirs before files at the same level', () => {
    const entries = [
      entry('README.md', false),
      entry('src/', true),
      entry('src/index.ts', false),
    ]
    expect(buildSortedEntries(entries).map(e => e.path)).toEqual([
      'src/',
      'src/index.ts',
      'README.md',
    ])
  })

  it('sorts siblings alphabetically with dirs first', () => {
    const entries = [
      entry('b.txt', false),
      entry('lib/', true),
      entry('a.txt', false),
      entry('docs/', true),
    ]
    const paths = buildSortedEntries(entries).map(e => e.path)
    expect(paths).toEqual(['docs/', 'lib/', 'a.txt', 'b.txt'])
  })

  it('handles orphaned files (no explicit dir entry)', () => {
    const entries = [entry('src/index.ts', false)]
    const sorted = buildSortedEntries(entries)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].path).toBe('src/index.ts')
  })

  it('handles empty input', () => {
    expect(buildSortedEntries([])).toEqual([])
  })
})

describe('getVisibleEntries', () => {
  const entries = [
    entry('src/', true),
    entry('src/utils/', true),
    entry('src/utils/helper.ts', false),
    entry('src/index.ts', false),
    entry('README.md', false),
  ]

  it('shows all when all dirs expanded', () => {
    const expanded = new Set(['src/', 'src/utils/'])
    expect(getVisibleEntries(entries, expanded, '')).toHaveLength(5)
  })

  it('hides children when parent dir collapsed', () => {
    const expanded = new Set<string>()
    const visible = getVisibleEntries(entries, expanded, '').map(e => e.path)
    expect(visible).toEqual(['src/', 'README.md'])
  })

  it('shows nested children only when all ancestors expanded', () => {
    const expanded = new Set(['src/'])
    const visible = getVisibleEntries(entries, expanded, '').map(e => e.path)
    expect(visible).toEqual(['src/', 'src/utils/', 'src/index.ts', 'README.md'])
  })

  it('bypasses collapse state and filters by path when filter active', () => {
    const expanded = new Set<string>()
    const visible = getVisibleEntries(entries, expanded, 'helper').map(e => e.path)
    expect(visible).toEqual(['src/utils/helper.ts'])
  })

  it('filter is case-insensitive', () => {
    const expanded = new Set<string>()
    const visible = getVisibleEntries(entries, expanded, 'INDEX').map(e => e.path)
    expect(visible).toEqual(['src/index.ts'])
  })

  it('shows files whose parent dirs have no explicit ZIP entry (implied dirs)', () => {
    // Many ZIPs omit directory entries — files inside must still be visible
    const orphaned = [entry('src/index.ts', false), entry('src/utils/helper.ts', false)]
    const expanded = new Set<string>() // no real dirs, nothing to expand
    const visible = getVisibleEntries(orphaned, expanded, '').map(e => e.path)
    expect(visible).toEqual(['src/index.ts', 'src/utils/helper.ts'])
  })
})
