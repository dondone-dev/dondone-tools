import { describe, it, expect } from 'vitest'
import { LOCALES, DEFAULT_LOCALE } from '@/i18n/config'
import { TOOL_ROUTES } from '@/lib/routes'
import { TOOLS } from '@/lib/tools-config'
import { getPathWithoutLocale, getSeoMetadata, getAllSeoRoutes, getJsonLd } from '@/lib/seo'

const HOSTNAME = 'https://tools.dondone.dev'

describe('getPathWithoutLocale', () => {
  it('returns path unchanged for default locale', () => {
    expect(getPathWithoutLocale('/encoding/qrcode-decode', 'en')).toBe('/encoding/qrcode-decode')
  })

  it('strips locale prefix for non-default locale', () => {
    expect(getPathWithoutLocale('/zh/encoding/qrcode-decode', 'zh')).toBe('/encoding/qrcode-decode')
  })

  it('returns / when stripping locale prefix leaves empty string', () => {
    expect(getPathWithoutLocale('/zh', 'zh')).toBe('/')
  })

  it('handles all non-default locales', () => {
    for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
      expect(getPathWithoutLocale(`/${locale}/hash/md5`, locale)).toBe('/hash/md5')
    }
  })
})

describe('getSeoMetadata — tool page', () => {
  it('returns correct canonical for en tool route', () => {
    const meta = getSeoMetadata('/encoding/qrcode-decode', 'en')
    expect(meta.canonicalUrl).toBe(`${HOSTNAME}/encoding/qrcode-decode`)
  })

  it('returns correct canonical for zh tool route', () => {
    const meta = getSeoMetadata('/zh/encoding/qrcode-decode', 'zh')
    expect(meta.canonicalUrl).toBe(`${HOSTNAME}/zh/encoding/qrcode-decode`)
  })

  it('title includes tool name and site name', () => {
    const meta = getSeoMetadata('/encoding/qrcode-decode', 'en')
    expect(meta.title).toContain('QR Code Decoder')
    expect(meta.title).toContain('dondone tools')
  })

  it('description is non-empty for all tool routes', () => {
    for (const route of TOOL_ROUTES) {
      const meta = getSeoMetadata(route, 'en')
      expect(meta.description.length).toBeGreaterThan(0)
    }
  })

  it('alternates include all locales and x-default', () => {
    const meta = getSeoMetadata('/encoding/qrcode-decode', 'en')
    const localeCodes = meta.alternates.map((a) => a.locale)
    for (const locale of LOCALES) {
      expect(localeCodes).toContain(locale)
    }
    expect(localeCodes).toContain('x-default')
  })

  it('x-default alternate points to default (en) route', () => {
    const meta = getSeoMetadata('/zh/encoding/qrcode-decode', 'zh')
    const xDefault = meta.alternates.find((a) => a.locale === 'x-default')
    expect(xDefault?.href).toBe(`${HOSTNAME}/encoding/qrcode-decode`)
  })

  it('og locale matches current locale', () => {
    expect(getSeoMetadata('/encoding/qrcode-decode', 'en').og.locale).toBe('en_US')
    expect(getSeoMetadata('/zh/encoding/qrcode-decode', 'zh').og.locale).toBe('zh_CN')
  })

  it('og locales lists all other locale tags', () => {
    const meta = getSeoMetadata('/encoding/qrcode-decode', 'en')
    expect(meta.og.locales).not.toContain('en_US')
    expect(meta.og.locales).toContain('zh_CN')
  })
})

describe('getSeoMetadata — home page', () => {
  it('canonical for en home is hostname root', () => {
    const meta = getSeoMetadata('/', 'en')
    expect(meta.canonicalUrl).toBe(`${HOSTNAME}/`)
  })

  it('canonical for zh home uses locale prefix', () => {
    const meta = getSeoMetadata('/zh', 'zh')
    expect(meta.canonicalUrl).toBe(`${HOSTNAME}/zh`)
  })

  it('title for home page contains site name', () => {
    const meta = getSeoMetadata('/', 'en')
    expect(meta.title).toContain('dondone tools')
  })

  it('description for home page is non-empty', () => {
    const meta = getSeoMetadata('/', 'en')
    expect(meta.description.length).toBeGreaterThan(0)
  })

  it('unknown route falls back to homepage metadata', () => {
    const unknown = getSeoMetadata('/does/not/exist', 'en')
    const home = getSeoMetadata('/', 'en')
    expect(unknown.title).toContain('dondone tools')
    expect(unknown.description).toBe(home.description)
  })
})

describe('getAllSeoRoutes', () => {
  it('includes root /', () => {
    expect(getAllSeoRoutes()).toContain('/')
  })

  it('includes all default tool routes', () => {
    const routes = getAllSeoRoutes()
    for (const route of TOOL_ROUTES) {
      expect(routes).toContain(route)
    }
  })

  it('includes localized home pages', () => {
    const routes = getAllSeoRoutes()
    for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
      expect(routes).toContain(`/${locale}`)
    }
  })

  it('includes localized tool routes', () => {
    const routes = getAllSeoRoutes()
    expect(routes).toContain('/zh/encoding/qrcode-decode')
    expect(routes).toContain('/ja/hash/md5')
  })

  it('default locale does not emit /en prefix', () => {
    const routes = getAllSeoRoutes()
    for (const route of routes) {
      // No route should be '/en' or start with '/en/' (locale prefix for English)
      expect(route === '/en' || route.startsWith('/en/')).toBe(false)
    }
  })

  it('has no duplicate routes', () => {
    const routes = getAllSeoRoutes()
    expect(routes.length).toBe(new Set(routes).size)
  })

  it('total count matches expected: 1 home + 24 tools + 8 locales × 25', () => {
    const nonDefaultLocaleCount = LOCALES.length - 1
    const expected = 1 + TOOL_ROUTES.length + nonDefaultLocaleCount * (1 + TOOL_ROUTES.length)
    expect(getAllSeoRoutes().length).toBe(expected)
  })
})

describe('route–tool registry integrity', () => {
  it('every TOOL_ROUTES entry resolves to a TOOLS config', () => {
    for (const route of TOOL_ROUTES) {
      const found = TOOLS.find((t) => t.href === route)
      expect(found, `No TOOLS entry for route ${route}`).toBeDefined()
    }
  })

  it('every TOOLS.href exists in TOOL_ROUTES', () => {
    const routeSet = new Set<string>(TOOL_ROUTES)
    for (const tool of TOOLS) {
      expect(routeSet.has(tool.href), `Tool ${tool.id} href ${tool.href} not in TOOL_ROUTES`).toBe(true)
    }
  })

  it('getSeoMetadata returns non-empty title and description for every TOOL_ROUTES in every locale', () => {
    for (const locale of LOCALES) {
      for (const route of TOOL_ROUTES) {
        const path = locale === DEFAULT_LOCALE ? route : `/${locale}${route}`
        const meta = getSeoMetadata(path, locale)
        expect(meta.title.length, `title empty for ${path}`).toBeGreaterThan(0)
        expect(meta.description.length, `description empty for ${path}`).toBeGreaterThan(0)
      }
    }
  })

  it('non-default locale canonical always includes locale prefix', () => {
    for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
      const meta = getSeoMetadata(`/${locale}/hash/md5`, locale)
      expect(meta.canonicalUrl).toContain(`/${locale}/`)
    }
  })

  it('default locale canonical never includes /en prefix', () => {
    for (const route of TOOL_ROUTES) {
      const meta = getSeoMetadata(route, 'en')
      expect(meta.canonicalUrl).not.toContain('/en/')
    }
  })

  it('canonical URL matches the pathname locale pattern', () => {
    const enMeta = getSeoMetadata('/hash/md5', 'en')
    expect(enMeta.canonicalUrl).toBe(`${HOSTNAME}/hash/md5`)

    const zhMeta = getSeoMetadata('/zh/hash/md5', 'zh')
    expect(zhMeta.canonicalUrl).toBe(`${HOSTNAME}/zh/hash/md5`)
  })
})

describe('getJsonLd', () => {
  it('home page returns WebSite schema', () => {
    const schemas = getJsonLd('/', 'en')
    expect(schemas).toHaveLength(1)
    expect(schemas[0]['@type']).toBe('WebSite')
  })

  it('tool page returns WebApplication and BreadcrumbList schemas', () => {
    const schemas = getJsonLd('/encoding/qrcode-decode', 'en')
    expect(schemas).toHaveLength(2)
    const types = schemas.map((s) => s['@type'])
    expect(types).toContain('WebApplication')
    expect(types).toContain('BreadcrumbList')
  })

  it('all schemas are valid JSON', () => {
    const routes = ['/', '/encoding/qrcode-decode', '/zh/hash/md5']
    const locales = ['en', 'zh', 'en'] as const
    routes.forEach((route, i) => {
      const schemas = getJsonLd(route, locales[i])
      for (const schema of schemas) {
        expect(() => JSON.parse(JSON.stringify(schema))).not.toThrow()
      }
    })
  })

  it('WebApplication url matches canonical', () => {
    const schemas = getJsonLd('/encoding/qrcode-decode', 'en')
    const app = schemas.find((s) => s['@type'] === 'WebApplication') as { url: string }
    const seo = getSeoMetadata('/encoding/qrcode-decode', 'en')
    expect(app.url).toBe(seo.canonicalUrl)
  })
})
