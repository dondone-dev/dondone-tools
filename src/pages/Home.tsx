import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ToolCard } from '@/components/layout/ToolCard'
import { TOOLS, CATEGORIES, getToolsByCategory } from '@/lib/tools-config'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { LOCALES, DEFAULT_LOCALE, type LocaleCode } from '@/i18n/config'
import { localeHref } from '@/i18n/utils'

export function Home() {
  const { t, i18n } = useTranslation(['common', 'tools'])
  const locale = (LOCALES.includes(i18n.language as LocaleCode) ? i18n.language : DEFAULT_LOCALE) as LocaleCode
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const trimmed = query.trim().toLowerCase()
  const filteredTools = trimmed
    ? TOOLS.filter((tool) => {
        const desc = t(tool.descriptionKey, { ns: 'tools' }).toLowerCase()
        const category = t(`categories.${tool.category}`, { ns: 'common' }).toLowerCase()
        return (
          tool.title.toLowerCase().includes(trimmed) ||
          desc.includes(trimmed) ||
          category.includes(trimmed)
        )
      })
    : null

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('home.title', { ns: 'common' })}</h1>
        <p className="text-muted-foreground text-sm">{t('site.tagline', { ns: 'common' })}</p>
      </div>

      <div className="relative w-full max-w-sm mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('home.searchPlaceholder', { ns: 'common' })}
          aria-label={t('home.searchPlaceholder', { ns: 'common' })}
          className="pl-8 pr-8 h-9 text-sm"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filteredTools !== null ? (
        filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                title={tool.title}
                descriptionKey={tool.descriptionKey}
                href={localeHref(locale, tool.href)}
                icon={tool.icon}
                category={tool.category}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('home.noMatches', { ns: 'common', query: query.trim() })}
          </p>
        )
      ) : (
        <div className="space-y-10">
          {CATEGORIES.map((category) => {
            const tools = getToolsByCategory(category)
            if (tools.length === 0) return null
            return (
              <section key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {t(`categories.${category}`, { ns: 'common' })}
                  </h2>
                  <Separator className="flex-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      title={tool.title}
                      descriptionKey={tool.descriptionKey}
                      href={localeHref(locale, tool.href)}
                      icon={tool.icon}
                      category={tool.category}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
