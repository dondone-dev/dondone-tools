import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import DOMPurify from 'dompurify'

import githubCss from './markdown-themes/github.css?raw'
import notionCss from './markdown-themes/notion.css?raw'
import minimalCss from './markdown-themes/minimal.css?raw'
import paperCss from './markdown-themes/paper.css?raw'

export type ThemeId = 'github' | 'notion' | 'minimal' | 'paper'

export interface ConvertOptions {
  theme: ThemeId
  customCss: string
}

export interface ConvertResult {
  bodyHtml: string
  fullHtml: string
}

const THEME_CSS: Record<ThemeId, string> = {
  github: githubCss,
  notion: notionCss,
  minimal: minimalCss,
  paper: paperCss,
}

const SHIKI_THEMES: Record<ThemeId, string> = {
  github: 'github-light',
  notion: 'min-light',
  minimal: 'vitesse-light',
  paper: 'slack-ochin',
}

const SHIKI_LANGS = [
  'javascript', 'typescript', 'jsx', 'tsx', 'json', 'python',
  'bash', 'css', 'html', 'yaml', 'sql', 'go', 'rust', 'java',
  'markdown', 'diff',
]

type Highlighter = Awaited<ReturnType<typeof import('shiki')['createHighlighter']>>

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter, createJavaScriptRegexEngine }) =>
      createHighlighter({
        themes: Object.values(SHIKI_THEMES),
        langs: SHIKI_LANGS,
        engine: createJavaScriptRegexEngine(),
      }),
    )
  }
  return highlighterPromise
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['span', 'pre', 'code'],
    ADD_ATTR: ['class', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  })
}

export async function parseMarkdown(
  markdown: string,
  theme: ThemeId,
): Promise<string> {
  const highlighter = await getHighlighter()
  const shikiTheme = SHIKI_THEMES[theme]

  const marked = new Marked(
    markedHighlight({
      async: true,
      highlight(code, lang) {
        const language = highlighter.getLoadedLanguages().includes(lang) ? lang : 'plaintext'
        return highlighter.codeToHtml(code, {
          lang: language,
          theme: shikiTheme,
        })
      },
    }),
  )

  marked.setOptions({ gfm: true, breaks: false })
  return marked.parse(markdown)
}

export async function convertMarkdownToHtml(
  markdown: string,
  options: ConvertOptions,
): Promise<ConvertResult> {
  const rawHtml = await parseMarkdown(markdown, options.theme)
  const bodyHtml = sanitizeHtml(rawHtml)
  const themeCss = THEME_CSS[options.theme]
  const fullHtml = buildFullHtml(bodyHtml, themeCss, options.customCss)

  return { bodyHtml, fullHtml }
}

function buildFullHtml(bodyHtml: string, themeCss: string, customCss: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${themeCss}
${customCss}
</style>
</head>
<body class="md-preview">
${bodyHtml}
</body>
</html>`
}
