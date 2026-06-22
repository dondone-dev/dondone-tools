import { useEffect, useState } from 'react'
import { buildHashLookup, type NameRiskData, type NameRiskV2 } from '@/lib/tools/name-risk'

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
      fetch(`${base}/name-risk.v2.json`).then((r) => r.json() as Promise<NameRiskV2>),
      fetch(`${base}/rare_characters.json`).then((r) => r.json()),
      fetch(`${base}/trendy_name_characters.json`).then((r) => r.json()),
      fetch(`${base}/feminine_folk_taboo_characters.json`).then((r) => r.json()),
      fetch(`${base}/generational_name_trends.json`).then((r) => r.json()),
      fetch(`${base}/compound_surname_risks.json`).then((r) => r.json()),
    ])
      .then(([v2, rareChars, trendyChars, folkTaboo, generationTrends, compoundSurnames]) => {
        cached = {
          meta: { generatedAt: v2.generatedAt, entryCount: v2.count },
          hashHexLen: v2.hashBits / 4,
          hashLookup: buildHashLookup(v2),
          rareChars,
          trendyChars,
          folkTaboo,
          generationTrends,
          compoundSurnames,
        }
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
