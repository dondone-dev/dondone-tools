import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES, DEFAULT_LOCALE, type LocaleCode } from '@/i18n/config'
import { TOOL_ROUTES } from '@/lib/routes'
import { getAllSeoRoutes, getSeoMetadata, getJsonLd, getPathWithoutLocale, type SeoMetadata } from '@/lib/seo'

const __filename = fileURLToPath(import.meta.url)
const rootDir = join(dirname(__filename), '..')
const distDir = join(rootDir, 'dist')

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildBodyHtml(route: string, locale: LocaleCode, seo: SeoMetadata): string {
  const toolPath = getPathWithoutLocale(route, locale)
  const isTool = (TOOL_ROUTES as readonly string[]).includes(toolPath)
  const displayTitle = isTool ? seo.title.split(' | ')[0] : seo.title

  return (
    '<div class="min-h-screen bg-background flex flex-col">' +
    '<main class="max-w-5xl mx-auto px-4 py-8 flex-1">' +
    '<div class="mb-8">' +
    `<h1 class="text-2xl font-semibold tracking-tight mb-1">${escapeHtml(displayTitle)}</h1>` +
    `<p class="text-sm text-muted-foreground">${escapeHtml(seo.description)}</p>` +
    '</div>' +
    '</main>' +
    '</div>'
  )
}

function buildSeoTags(route: string, locale: LocaleCode, seo: SeoMetadata): string {
  const lines: string[] = [
    `<title>${escapeAttr(seo.title)}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}" data-seo-managed="true" />`,
    `<link rel="canonical" href="${escapeAttr(seo.canonicalUrl)}" data-seo-managed="true" />`,
    ...seo.alternates.map(
      (alt) =>
        `<link rel="alternate" hreflang="${escapeAttr(alt.locale)}" href="${escapeAttr(alt.href)}" data-seo-managed="true" />`,
    ),
    `<meta property="og:title" content="${escapeAttr(seo.og.title)}" data-seo-managed="true" />`,
    `<meta property="og:description" content="${escapeAttr(seo.og.description)}" data-seo-managed="true" />`,
    `<meta property="og:url" content="${escapeAttr(seo.og.url)}" data-seo-managed="true" />`,
    `<meta property="og:type" content="${seo.og.type}" data-seo-managed="true" />`,
    `<meta property="og:locale" content="${seo.og.locale}" data-seo-managed="true" />`,
    ...seo.og.locales.map(
      (l) => `<meta property="og:locale:alternate" content="${l}" data-seo-managed="true" />`,
    ),
    `<meta name="twitter:card" content="${seo.twitter.card}" data-seo-managed="true" />`,
    `<meta name="twitter:title" content="${escapeAttr(seo.twitter.title)}" data-seo-managed="true" />`,
    `<meta name="twitter:description" content="${escapeAttr(seo.twitter.description)}" data-seo-managed="true" />`,
    ...getJsonLd(route, locale).map(
      (schema) =>
        `<script type="application/ld+json" data-seo-managed="true">${JSON.stringify(schema)}</script>`,
    ),
  ]
  return lines.map((l) => `    ${l}`).join('\n')
}

function injectIntoTemplate(
  template: string,
  route: string,
  locale: LocaleCode,
  seo: SeoMetadata,
): string {
  const body = buildBodyHtml(route, locale, seo)
  const html = template
    .replace(/<html lang="[^"]*"/, `<html lang="${locale}"`)
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta name="description"[^>]*\/>/, '')
    .replace(/<link rel="canonical"[^>]*\/>/, '')
    .replace('</head>', `${buildSeoTags(route, locale, seo)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  return html
}

function detectLocale(route: string): LocaleCode {
  for (const locale of LOCALES) {
    if (locale !== DEFAULT_LOCALE && (route === `/${locale}` || route.startsWith(`/${locale}/`))) {
      return locale
    }
  }
  return DEFAULT_LOCALE
}

function routeToOutputPath(route: string): string {
  if (route === '/') return join(distDir, 'index.html')
  return join(distDir, `${route.slice(1)}.html`)
}

const template = readFileSync(join(distDir, 'index.html'), 'utf-8')
const routes = getAllSeoRoutes()

console.log(`Prerendering ${routes.length} routes...`)

for (const route of routes) {
  const locale = detectLocale(route)
  const seo = getSeoMetadata(route, locale)
  const html = injectIntoTemplate(template, route, locale, seo)
  const outputPath = routeToOutputPath(route)

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, html, 'utf-8')
}

console.log(`Done. Generated ${routes.length} HTML files in dist/.`)
