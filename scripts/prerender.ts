/**
 * Build-time prerender script.
 *
 * Run after `vite build` via `vite-node scripts/prerender.ts`.
 * For each route in getAllSeoRoutes(), injects route-specific SEO tags
 * into a copy of dist/index.html and writes the result to
 * dist/<route>/index.html, making metadata visible to crawlers
 * without adding a server-side runtime.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES, DEFAULT_LOCALE, type LocaleCode } from '@/i18n/config'
import { getAllSeoRoutes, getSeoMetadata, type SeoMetadata } from '@/lib/seo'

const __filename = fileURLToPath(import.meta.url)
const rootDir = join(dirname(__filename), '..')
const distDir = join(rootDir, 'dist')

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildSeoTags(seo: SeoMetadata): string {
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
  ]
  return lines.map((l) => `    ${l}`).join('\n')
}

function injectSeoIntoTemplate(template: string, seo: SeoMetadata): string {
  // Remove static title, description, and canonical from the template
  // (SeoHead will re-inject the correct values at runtime; we inject here for crawlers)
  let html = template
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta name="description"[^>]*\/>/, '')
    .replace(/<link rel="canonical"[^>]*\/>/, '')

  return html.replace('</head>', `${buildSeoTags(seo)}\n  </head>`)
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
  return join(distDir, route.slice(1), 'index.html')
}

const template = readFileSync(join(distDir, 'index.html'), 'utf-8')
const routes = getAllSeoRoutes()

console.log(`Prerendering ${routes.length} routes...`)

for (const route of routes) {
  const locale = detectLocale(route)
  const seo = getSeoMetadata(route, locale)
  const html = injectSeoIntoTemplate(template, seo)
  const outputPath = routeToOutputPath(route)

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, html, 'utf-8')
}

console.log(`Done. Generated ${routes.length} HTML files in dist/.`)
