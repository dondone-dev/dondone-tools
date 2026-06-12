import { LOCALES, DEFAULT_LOCALE, type LocaleCode } from '@/i18n/config'
import { TOOL_ROUTES } from '@/lib/routes'
import { TOOLS } from '@/lib/tools-config'
import { localeHref } from '@/i18n/utils'

import enTools from '@/i18n/locales/en/tools.json'
import zhTools from '@/i18n/locales/zh/tools.json'
import jaTools from '@/i18n/locales/ja/tools.json'
import frTools from '@/i18n/locales/fr/tools.json'
import koTools from '@/i18n/locales/ko/tools.json'
import esTools from '@/i18n/locales/es/tools.json'
import deTools from '@/i18n/locales/de/tools.json'
import ptTools from '@/i18n/locales/pt/tools.json'
import ruTools from '@/i18n/locales/ru/tools.json'

import enCommon from '@/i18n/locales/en/common.json'
import zhCommon from '@/i18n/locales/zh/common.json'
import jaCommon from '@/i18n/locales/ja/common.json'
import frCommon from '@/i18n/locales/fr/common.json'
import koCommon from '@/i18n/locales/ko/common.json'
import esCommon from '@/i18n/locales/es/common.json'
import deCommon from '@/i18n/locales/de/common.json'
import ptCommon from '@/i18n/locales/pt/common.json'
import ruCommon from '@/i18n/locales/ru/common.json'

// ---- Types ----

export interface SeoMetadata {
  title: string
  description: string
  canonicalUrl: string
  alternates: Array<{ locale: LocaleCode | 'x-default'; href: string }>
  og: {
    title: string
    description: string
    url: string
    type: 'website'
    locale: string
    locales: string[]
  }
  twitter: {
    card: 'summary'
    title: string
    description: string
  }
}

type ToolEntry = {
  title?: string
  description?: string
  seoTitle?: string
  seoDescription?: string
}

// ---- Constants ----

const HOSTNAME = 'https://tools.dondone.dev'
const SITE_NAME = 'dondone tools'

const OG_LOCALE_MAP: Record<LocaleCode, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  ja: 'ja_JP',
  fr: 'fr_FR',
  ko: 'ko_KR',
  es: 'es_ES',
  de: 'de_DE',
  pt: 'pt_BR',
  ru: 'ru_RU',
}

// ---- Locale data maps (static imports work at both runtime and build time) ----

const TOOLS_BY_LOCALE: Record<LocaleCode, Record<string, ToolEntry>> = {
  en: enTools as Record<string, ToolEntry>,
  zh: zhTools as Record<string, ToolEntry>,
  ja: jaTools as Record<string, ToolEntry>,
  fr: frTools as Record<string, ToolEntry>,
  ko: koTools as Record<string, ToolEntry>,
  es: esTools as Record<string, ToolEntry>,
  de: deTools as Record<string, ToolEntry>,
  pt: ptTools as Record<string, ToolEntry>,
  ru: ruTools as Record<string, ToolEntry>,
}

type SiteSection = { name?: string; tagline?: string; seoTitle?: string; seoDescription?: string }
type CommonJson = { site: SiteSection }

const COMMON_BY_LOCALE: Record<LocaleCode, CommonJson> = {
  en: enCommon as CommonJson,
  zh: zhCommon as CommonJson,
  ja: jaCommon as CommonJson,
  fr: frCommon as CommonJson,
  ko: koCommon as CommonJson,
  es: esCommon as CommonJson,
  de: deCommon as CommonJson,
  pt: ptCommon as CommonJson,
  ru: ruCommon as CommonJson,
}

// ---- Pure helpers ----

export function getPathWithoutLocale(pathname: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return pathname
  return pathname.replace(`/${locale}`, '') || '/'
}

function findToolByPath(toolPath: string) {
  return TOOLS.find((t) => t.href === toolPath)
}

function buildCanonicalUrl(toolPath: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return HOSTNAME + toolPath
  if (toolPath === '/') return `${HOSTNAME}/${locale}`
  return `${HOSTNAME}/${locale}${toolPath}`
}

function buildAlternates(toolPath: string): SeoMetadata['alternates'] {
  const perLocale: SeoMetadata['alternates'] = LOCALES.map((locale) => ({
    locale,
    href: HOSTNAME + localeHref(locale, toolPath),
  }))
  return [...perLocale, { locale: 'x-default', href: HOSTNAME + toolPath }]
}

// ---- Public API ----

export function getSeoMetadata(pathname: string, locale: LocaleCode): SeoMetadata {
  const toolPath = getPathWithoutLocale(pathname, locale)
  const tool = findToolByPath(toolPath)

  let title: string
  let description: string

  if (tool) {
    const entry = TOOLS_BY_LOCALE[locale][tool.id] ?? {}
    const toolTitle = entry.seoTitle ?? entry.title ?? tool.title
    title = `${toolTitle} | ${SITE_NAME}`
    description = entry.seoDescription ?? entry.description ?? ''
  } else {
    const site = COMMON_BY_LOCALE[locale].site
    title = site.seoTitle ?? SITE_NAME
    description = site.seoDescription ?? site.tagline ?? ''
  }

  const canonicalUrl = buildCanonicalUrl(toolPath, locale)
  const alternates = buildAlternates(toolPath)
  const ogLocale = OG_LOCALE_MAP[locale]
  const ogLocaleAlternates = LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE_MAP[l])

  return {
    title,
    description,
    canonicalUrl,
    alternates,
    og: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      locale: ogLocale,
      locales: ogLocaleAlternates,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export function getAllSeoRoutes(): string[] {
  const defaultRoutes: string[] = ['/', ...TOOL_ROUTES]
  const localizedRoutes = LOCALES
    .filter((l) => l !== DEFAULT_LOCALE)
    .flatMap((l) => [`/${l}`, ...TOOL_ROUTES.map((r) => `/${l}${r}`)])
  return [...defaultRoutes, ...localizedRoutes]
}

// ---- JSON-LD ----

interface WebSiteSchema {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  name: string
  url: string
  description: string
}

interface WebApplicationSchema {
  '@context': 'https://schema.org'
  '@type': 'WebApplication'
  name: string
  url: string
  description: string
  applicationCategory: string
  operatingSystem: string
}

interface BreadcrumbListSchema {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item?: string
  }>
}

export type JsonLdSchema = WebSiteSchema | WebApplicationSchema | BreadcrumbListSchema

export function getJsonLd(pathname: string, locale: LocaleCode): JsonLdSchema[] {
  const toolPath = getPathWithoutLocale(pathname, locale)
  const tool = findToolByPath(toolPath)
  const seo = getSeoMetadata(pathname, locale)

  if (!tool) {
    const schema: WebSiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: HOSTNAME + '/',
      description: seo.description,
    }
    return [schema]
  }

  const appSchema: WebApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: seo.title.replace(` | ${SITE_NAME}`, ''),
    url: seo.canonicalUrl,
    description: seo.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
  }

  const breadcrumbSchema: BreadcrumbListSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: HOSTNAME + '/' },
      { '@type': 'ListItem', position: 2, name: tool.category },
      { '@type': 'ListItem', position: 3, name: tool.title, item: seo.canonicalUrl },
    ],
  }

  return [appSchema, breadcrumbSchema]
}
