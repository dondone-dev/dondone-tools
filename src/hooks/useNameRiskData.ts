import { useEffect, useState } from 'react'
import type { NameRiskData } from '@/lib/tools/name-risk'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface UseNameRiskDataResult {
  data: NameRiskData | null
  status: Status
  error: string | null
}

let cached: NameRiskData | null = null

export function useNameRiskData(): UseNameRiskDataResult {
  const [status, setStatus] = useState<Status>(cached ? 'ready' : 'idle')
  const [data, setData] = useState<NameRiskData | null>(cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) return

    setStatus('loading')

    const base = '/data/name-risk'
    Promise.all([
      fetch(`${base}/name-risk.meta.json`).then((r) => r.json()),
      fetch(`${base}/name-risk.hashes.json`).then((r) => r.json()),
      fetch(`${base}/rare_characters.json`).then((r) => r.json()),
      fetch(`${base}/trendy_name_characters.json`).then((r) => r.json()),
      fetch(`${base}/feminine_folk_taboo_characters.json`).then((r) => r.json()),
      fetch(`${base}/generational_name_trends.json`).then((r) => r.json()),
      fetch(`${base}/compound_surname_risks.json`).then((r) => r.json()),
    ])
      .then(([meta, hashes, rareChars, trendyChars, folkTaboo, generationTrends, compoundSurnames]) => {
        cached = { meta, hashes, rareChars, trendyChars, folkTaboo, generationTrends, compoundSurnames }
        setData(cached)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setStatus('error')
      })
  }, [])

  return { data, status, error }
}
