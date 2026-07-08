import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Download, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { convertMarkdownToHtml, type ThemeId, type ConvertResult } from '@/lib/tools/markdown-to-html'

type ViewMode = 'split' | 'preview'

const THEMES: ThemeId[] = ['github', 'notion', 'minimal', 'paper']

const STORAGE_THEME_KEY = 'markdown-to-html:theme'
const STORAGE_CSS_KEY = 'markdown-to-html:custom-css'

function getStoredTheme(): ThemeId {
  const stored = localStorage.getItem(STORAGE_THEME_KEY)
  if (stored && THEMES.includes(stored as ThemeId)) return stored as ThemeId
  return 'github'
}

export default function MarkdownToHtmlPage() {
  const { t } = useTranslation('tools')
  const [markdown, setMarkdown] = useState('')
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme)
  const [customCss, setCustomCss] = useState(() => localStorage.getItem(STORAGE_CSS_KEY) ?? '')
  const [showCustomCss, setShowCustomCss] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [copied, setCopied] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(STORAGE_CSS_KEY, customCss)
  }, [customCss])

  const convert = useCallback(async (md: string, th: ThemeId, css: string) => {
    const id = ++requestId.current
    if (!md.trim()) {
      setResult(null)
      return
    }
    const res = await convertMarkdownToHtml(md, { theme: th, customCss: css })
    if (requestId.current === id) setResult(res)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => convert(markdown, theme, customCss), 300)
    return () => clearTimeout(timer)
  }, [markdown, theme, customCss, convert])

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.fullHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!result) return
    const blob = new Blob([result.fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'markdown.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolLayout toolId="markdown-to-html" category="Text">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {THEMES.map((th) => (
              <Button
                key={th}
                size="sm"
                variant={theme === th ? 'secondary' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => setTheme(th)}
              >
                {t(`markdown-to-html.theme${th.charAt(0).toUpperCase() + th.slice(1)}`)}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant={showCustomCss ? 'secondary' : 'ghost'}
            className="h-7 text-xs px-2.5 gap-1"
            onClick={() => setShowCustomCss((v) => !v)}
          >
            <Code className="h-3.5 w-3.5" />
            {t('markdown-to-html.customCss')}
          </Button>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'split' ? 'secondary' : 'outline'}
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode('split')}
            >
              {t('markdown-to-html.viewSplit')}
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'preview' ? 'secondary' : 'outline'}
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode('preview')}
            >
              {t('markdown-to-html.viewPreview')}
            </Button>
          </div>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 gap-1"
            onClick={handleCopy}
            disabled={!result}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t('markdown-to-html.copied') : t('markdown-to-html.copyHtml')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 gap-1"
            onClick={handleDownload}
            disabled={!result}
          >
            <Download className="h-3.5 w-3.5" />
            {t('markdown-to-html.downloadHtml')}
          </Button>
        </div>

        {showCustomCss && (
          <Textarea
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            placeholder={t('markdown-to-html.customCssPlaceholder')}
            rows={4}
            className="font-mono text-xs resize-y"
            spellCheck={false}
          />
        )}

        <div className={cn('grid grid-cols-1 gap-3', viewMode === 'split' && 'md:grid-cols-2')}>
          {viewMode === 'split' && (
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={t('markdown-to-html.inputPlaceholder')}
              rows={20}
              className="font-mono text-sm resize-y"
              spellCheck={false}
            />
          )}
          <div className={cn(
            'border border-border rounded-md overflow-hidden min-h-[400px]',
            viewMode === 'split' ? 'md:min-h-0' : 'md:min-h-[600px]',
          )}>
            {result ? (
              <iframe
                srcDoc={result.fullHtml}
                sandbox="allow-same-origin"
                className="w-full h-full min-h-[400px]"
                title="preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-sm text-muted-foreground p-4 text-center">
                {t('markdown-to-html.emptyPreview')}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
