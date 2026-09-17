// Locale-agnostic tool search: the search box should find a tool regardless
// of which language the UI is currently displaying, so a query lets users
// search in whatever language they think of the tool in — e.g. typing
// "身份证" finds the ID Card tool even while the UI is in English, and typing
// "hash" finds MD5/SHA tools even while the UI is in Chinese.
//
// Each tool's index entry concatenates its id plus every locale's title,
// description, and category label into one lowercase blob, checked with a
// plain substring match. No tokenizer is needed: CJK queries are already
// contiguous substrings of the target string.

import { TOOLS, type ToolConfig } from '@/lib/tools-config'
import { LOCALES, type LocaleCode } from '@/i18n/config'

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

type ToolEntry = { title?: string; description?: string }
type CommonJson = { categories?: Record<string, string> }

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

const COMMON_BY_LOCALE: Record<LocaleCode, CommonJson> = {
  en: enCommon,
  zh: zhCommon,
  ja: jaCommon,
  fr: frCommon,
  ko: koCommon,
  es: esCommon,
  de: deCommon,
  pt: ptCommon,
  ru: ruCommon,
}

function buildSearchIndex(): Record<string, string> {
  const index: Record<string, string> = {}
  for (const tool of TOOLS) {
    const parts = [tool.id]
    for (const locale of LOCALES) {
      const entry = TOOLS_BY_LOCALE[locale][tool.id]
      if (entry?.title) parts.push(entry.title)
      if (entry?.description) parts.push(entry.description)
      const categoryLabel = COMMON_BY_LOCALE[locale].categories?.[tool.category]
      if (categoryLabel) parts.push(categoryLabel)
    }
    index[tool.id] = parts.join(' ').toLowerCase()
  }
  return index
}

const SEARCH_INDEX = buildSearchIndex()

/** Matches a query against every locale's title/description/category for each tool. */
export function searchTools(query: string): ToolConfig[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  return TOOLS.filter((tool) => SEARCH_INDEX[tool.id].includes(trimmed))
}
