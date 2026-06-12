import { useEffect } from 'react'
import { type LocaleCode } from '@/i18n/config'
import { getSeoMetadata, getJsonLd } from '@/lib/seo'

interface SeoHeadProps {
  currentLocale: LocaleCode
  currentPath: string
}

const SEO_ATTR = 'data-seo-managed'

function createMeta(attrs: Record<string, string>): HTMLMetaElement {
  const el = document.createElement('meta')
  el.setAttribute(SEO_ATTR, 'true')
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  return el
}

function createLink(attrs: Record<string, string>): HTMLLinkElement {
  const el = document.createElement('link')
  el.setAttribute(SEO_ATTR, 'true')
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  return el
}

export function SeoHead({ currentLocale, currentPath }: SeoHeadProps) {
  useEffect(() => {
    const seo = getSeoMetadata(currentPath, currentLocale)

    // Remove all previously managed SEO tags before re-injecting
    document.querySelectorAll(`[${SEO_ATTR}]`).forEach((el) => el.remove())

    const elements: Element[] = []

    document.title = seo.title

    elements.push(createMeta({ name: 'description', content: seo.description }))
    elements.push(createLink({ rel: 'canonical', href: seo.canonicalUrl }))

    for (const alt of seo.alternates) {
      elements.push(createLink({ rel: 'alternate', hreflang: alt.locale, href: alt.href }))
    }

    elements.push(createMeta({ property: 'og:title', content: seo.og.title }))
    elements.push(createMeta({ property: 'og:description', content: seo.og.description }))
    elements.push(createMeta({ property: 'og:url', content: seo.og.url }))
    elements.push(createMeta({ property: 'og:type', content: seo.og.type }))
    elements.push(createMeta({ property: 'og:locale', content: seo.og.locale }))
    for (const altLocale of seo.og.locales) {
      elements.push(createMeta({ property: 'og:locale:alternate', content: altLocale }))
    }

    elements.push(createMeta({ name: 'twitter:card', content: seo.twitter.card }))
    elements.push(createMeta({ name: 'twitter:title', content: seo.twitter.title }))
    elements.push(createMeta({ name: 'twitter:description', content: seo.twitter.description }))

    for (const schema of getJsonLd(currentPath, currentLocale)) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute(SEO_ATTR, 'true')
      script.textContent = JSON.stringify(schema)
      elements.push(script)
    }

    for (const el of elements) {
      document.head.appendChild(el)
    }

    return () => {
      document.querySelectorAll(`[${SEO_ATTR}]`).forEach((el) => el.remove())
    }
  }, [currentLocale, currentPath])

  return null
}
