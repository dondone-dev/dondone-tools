import { useState, useCallback } from 'react'

export function useClipboard(timeout = 1500) {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setTimeout(() => setCopiedText(null), timeout)
    } catch {
      /* ignore */
    }
  }, [timeout])

  return { copiedText, copy }
}
