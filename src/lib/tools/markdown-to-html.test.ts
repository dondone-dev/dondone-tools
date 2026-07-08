// @vitest-environment jsdom
// happy-dom (the project default) mis-parses <script>/<img> in ways that make
// DOMPurify silently skip stripping them; jsdom matches real browser behavior.
import { describe, it, expect } from 'vitest'
import { convertMarkdownToHtml, parseMarkdown, type ThemeId } from './markdown-to-html'

describe('parseMarkdown', () => {
  it('converts heading to h1', async () => {
    const html = await parseMarkdown('# Hello', 'github')
    expect(html).toContain('<h1>Hello</h1>')
  })

  it('converts GFM table correctly', async () => {
    const md = `| A | B |\n|---|---|\n| 1 | 2 |`
    const html = await parseMarkdown(md, 'github')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<td>1</td>')
  })

  it('converts GFM task list', async () => {
    const md = `- [x] Done\n- [ ] Todo`
    const html = await parseMarkdown(md, 'github')
    expect(html).toContain('type="checkbox"')
  })

  it('applies syntax highlighting to fenced code blocks', async () => {
    const md = '```javascript\nconst x = 1;\n```'
    const html = await parseMarkdown(md, 'github')
    expect(html).toContain('<span')
    expect(html).toContain('shiki')
  })

  it('handles empty input gracefully', async () => {
    const html = await parseMarkdown('', 'github')
    expect(html).toBe('')
  })

  it('renders inline code', async () => {
    const html = await parseMarkdown('Use `const` keyword', 'github')
    expect(html).toContain('<code>const</code>')
  })

  it('renders blockquote', async () => {
    const html = await parseMarkdown('> quoted text', 'github')
    expect(html).toContain('<blockquote>')
  })
})

describe('convertMarkdownToHtml', () => {
  it('fullHtml contains DOCTYPE and proper structure', async () => {
    const result = await convertMarkdownToHtml('Hello', { theme: 'github', customCss: '' })
    expect(result.fullHtml).toContain('<!DOCTYPE html>')
    expect(result.fullHtml).toContain('<body class="md-preview">')
    expect(result.fullHtml).toContain('</html>')
    expect(result.fullHtml).toContain('<meta charset="utf-8">')
  })

  it('fullHtml includes theme CSS before custom CSS', async () => {
    const customCss = '.md-preview { color: red; }'
    const result = await convertMarkdownToHtml('Hello', { theme: 'github', customCss })
    const styleStart = result.fullHtml.indexOf('<style>')
    const styleEnd = result.fullHtml.indexOf('</style>')
    const styleContent = result.fullHtml.slice(styleStart, styleEnd)
    expect(styleContent).toContain('font-family')
    const themeCssPos = styleContent.indexOf('font-family')
    const customCssPos = styleContent.indexOf('color: red')
    expect(customCssPos).toBeGreaterThan(themeCssPos)
  })

  it('produces different CSS for different themes', async () => {
    const md = '# Test'
    const github = await convertMarkdownToHtml(md, { theme: 'github', customCss: '' })
    const paper = await convertMarkdownToHtml(md, { theme: 'paper', customCss: '' })
    expect(github.fullHtml).not.toEqual(paper.fullHtml)
    expect(github.fullHtml).toContain('#1f2328')
    expect(paper.fullHtml).toContain('#faf8f2')
  })

  it('applies custom CSS in the output', async () => {
    const customCss = '.md-preview h1 { font-size: 3em; }'
    const result = await convertMarkdownToHtml('# Big', { theme: 'minimal', customCss })
    expect(result.fullHtml).toContain('font-size: 3em')
  })

  it('strips script tags and event handler attributes', async () => {
    const md = 'Hello <script>alert(1)</script> <img src="x" onerror="alert(2)">'
    const result = await convertMarkdownToHtml(md, { theme: 'github', customCss: '' })
    expect(result.bodyHtml).not.toContain('<script')
    expect(result.bodyHtml).not.toContain('onerror')
  })

  it('each theme produces unique CSS content', async () => {
    const themes: ThemeId[] = ['github', 'notion', 'minimal', 'paper']
    const results = await Promise.all(
      themes.map((theme) => convertMarkdownToHtml('test', { theme, customCss: '' })),
    )
    const cssContents = results.map((r) => {
      const start = r.fullHtml.indexOf('<style>')
      const end = r.fullHtml.indexOf('</style>')
      return r.fullHtml.slice(start, end)
    })
    const unique = new Set(cssContents)
    expect(unique.size).toBe(4)
  })
})
