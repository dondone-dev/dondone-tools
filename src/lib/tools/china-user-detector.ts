export type ChinaDetectorMode = 'greater-china' | 'mainland'
export type ChinaDetectorStatus = 'match' | 'miss' | 'unknown' | 'unavailable' | 'error'
export type ChinaDetectorConfidence = 'high' | 'medium' | 'low' | 'unknown'

export interface ChinaDetectorOptions {
  mode: ChinaDetectorMode
  strict: boolean
}

export interface SignalResult {
  id: 'language' | 'timezone' | 'utc-offset' | 'emoji' | 'font' | 'network'
  status: ChinaDetectorStatus
  score: number
  maxScore: number
  observed: string[]
  reasonKey: string
}

export interface ChinaDetectorResult {
  mode: ChinaDetectorMode
  strict: boolean
  score: number
  maxScore: number
  confidence: ChinaDetectorConfidence
  resultKey: string
  summaryKey: string
  signals: SignalResult[]
}

export interface BrowserEnvironment {
  languages: string[]
  timeZone: string | undefined
  utcOffsetMinutes: number
}

export interface NetworkProbeOptions {
  timeout?: number
  blockedProbeUrls?: string[]
  controlProbeUrls?: string[]
}

export interface NetworkProbeResult extends SignalResult {
  details: {
    url: string
    reachable: boolean
    elapsed: number
  }[]
}

const MAINLAND_LANGUAGE_TAGS = ['zh', 'zh-cn', 'zh-hans', 'zh-hans-cn']

const MAINLAND_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Chongqing',
  'Asia/Harbin',
  'Asia/Urumqi',
  'Asia/Kashgar',
  'Asia/Beijing',
  'PRC',
]

const GREATER_CHINA_TIMEZONES = [
  ...MAINLAND_TIMEZONES,
  'Asia/Hong_Kong',
  'Asia/Macau',
  'Asia/Taipei',
  'Hongkong',
  'ROC',
]

const DEFAULT_FONT_LIST = [
  'DengXian',
  'FangSong',
  'Microsoft YaHei',
  'SimSun',
  'SimHei',
  'HarmonyOS Sans',
  'Alibaba PuHuiTi',
]

const DEFAULT_BLOCKED_PROBE_URLS = [
  'https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico',
  'https://chatgpt.com/favicon.ico',
]

const DEFAULT_CONTROL_PROBE_URLS = [
  'https://www.baidu.com/favicon.ico',
]

export function evaluateLanguageSignal(
  languages: string[],
  options: ChinaDetectorOptions,
): SignalResult {
  const { mode, strict } = options
  const candidates = strict ? languages.slice(0, 1) : languages

  const normalized = candidates.map(l => l.trim().toLowerCase())

  const isMatch = mode === 'mainland'
    ? normalized.some(l => MAINLAND_LANGUAGE_TAGS.includes(l))
    : normalized.some(l => l === 'zh' || l.startsWith('zh-'))

  return {
    id: 'language',
    status: normalized.length === 0 ? 'unknown' : isMatch ? 'match' : 'miss',
    score: isMatch ? 3 : 0,
    maxScore: 3,
    observed: candidates,
    reasonKey: isMatch ? 'languageZh' : 'languageNone',
  }
}

export function evaluateTimeZoneSignal(
  timeZone: string | undefined,
  options: ChinaDetectorOptions,
): SignalResult {
  if (!timeZone) {
    return {
      id: 'timezone',
      status: 'unknown',
      score: 0,
      maxScore: 3,
      observed: [],
      reasonKey: 'timezoneUnknown',
    }
  }

  const zones = options.mode === 'mainland' ? MAINLAND_TIMEZONES : GREATER_CHINA_TIMEZONES
  const isMatch = zones.some(z => z.toLowerCase() === timeZone.toLowerCase())

  return {
    id: 'timezone',
    status: isMatch ? 'match' : 'miss',
    score: isMatch ? 3 : 0,
    maxScore: 3,
    observed: [timeZone],
    reasonKey: isMatch ? 'timezoneExact' : 'timezoneNone',
  }
}

export function evaluateUtcOffsetSignal(
  offsetMinutes: number,
  options: ChinaDetectorOptions,
): SignalResult {
  if (options.strict) {
    return {
      id: 'utc-offset',
      status: 'unavailable',
      score: 0,
      maxScore: 0,
      observed: [`UTC${offsetMinutes <= 0 ? '+' : '-'}${Math.abs(offsetMinutes / 60)}`],
      reasonKey: 'utcOffsetStrictDisabled',
    }
  }

  // UTC+8 = offset -480 (getTimezoneOffset returns minutes *behind* UTC)
  const isUtcPlus8 = offsetMinutes === -480
  return {
    id: 'utc-offset',
    status: isUtcPlus8 ? 'match' : 'miss',
    score: isUtcPlus8 ? 1 : 0,
    maxScore: 1,
    observed: [`UTC${offsetMinutes <= 0 ? '+' : '-'}${Math.abs(offsetMinutes / 60)}`],
    reasonKey: isUtcPlus8 ? 'utcOffsetOnly' : 'utcOffsetNone',
  }
}

export function evaluateAggregate(
  signals: SignalResult[],
  options: ChinaDetectorOptions,
): ChinaDetectorResult {
  const score = signals.reduce((sum, s) => sum + s.score, 0)
  const maxScore = signals.reduce((sum, s) => sum + s.maxScore, 0)

  const networkSignal = signals.find(s => s.id === 'network')
  const localSignals = signals.filter(s => s.id !== 'network')
  const hasLocalMatch = localSignals.some(s => s.status === 'match')
  const unavailableCount = signals.filter(
    s => s.status === 'unavailable' || s.status === 'unknown',
  ).length

  let confidence: ChinaDetectorConfidence
  if (score >= 7 || (networkSignal?.status === 'match' && hasLocalMatch)) {
    confidence = 'high'
  } else if (score >= 4) {
    confidence = 'medium'
  } else if (score >= 1) {
    confidence = 'low'
  } else {
    confidence = unavailableCount >= 2 ? 'unknown' : 'low'
  }

  let resultKey: string
  if (confidence === 'high') {
    resultKey = options.mode === 'mainland' ? 'mainlandLikely' : 'greaterChinaLikely'
  } else if (confidence === 'medium') {
    resultKey = 'someSignals'
  } else if (confidence === 'unknown') {
    resultKey = 'unknown'
  } else {
    resultKey = 'noStrongSignals'
  }

  const strongestSignal = [...signals].sort((a, b) => b.score - a.score)[0]
  const summaryKey = strongestSignal?.reasonKey ?? 'unknown'

  return {
    mode: options.mode,
    strict: options.strict,
    score,
    maxScore,
    confidence,
    resultKey,
    summaryKey,
    signals,
  }
}

export function readBrowserEnvironment(): BrowserEnvironment {
  if (typeof navigator === 'undefined') {
    return { languages: [], timeZone: undefined, utcOffsetMinutes: 0 }
  }

  const languages = navigator.languages?.length
    ? Array.from(navigator.languages)
    : navigator.language
      ? [navigator.language]
      : []

  let timeZone: string | undefined
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    timeZone = undefined
  }

  const utcOffsetMinutes = new Date().getTimezoneOffset()

  return { languages, timeZone, utcOffsetMinutes }
}

export function analyzeRenderedPixels(data: ArrayLike<number>): {
  opaquePixelCount: number
  isMonochrome: boolean
} {
  let opaquePixelCount = 0
  let isMonochrome = true

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a > 0) {
      opaquePixelCount++
      if (isMonochrome && !(r === g && g === b)) {
        isMonochrome = false
      }
    }
  }

  return { opaquePixelCount, isMonochrome }
}

export function detectEmojiSignal(): SignalResult {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') {
    return {
      id: 'emoji',
      status: 'unavailable',
      score: 0,
      maxScore: 2,
      observed: [],
      reasonKey: 'emojiUnavailable',
    }
  }

  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('windows')) {
    return {
      id: 'emoji',
      status: 'unavailable',
      score: 0,
      maxScore: 2,
      observed: ['windows'],
      reasonKey: 'emojiWindowsSkipped',
    }
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return {
        id: 'emoji',
        status: 'unavailable',
        score: 0,
        maxScore: 2,
        observed: [],
        reasonKey: 'emojiUnavailable',
      }
    }

    const renderText = (text: string): ReturnType<typeof analyzeRenderedPixels> => {
      ctx.clearRect(0, 0, 16, 16)
      ctx.font = '14px sans-serif'
      ctx.fillText(text, 0, 14)
      const data = ctx.getImageData(0, 0, 16, 16).data
      return analyzeRenderedPixels(data)
    }

    const control = renderText('\u{1F600}')
    if (control.opaquePixelCount < 10 || control.isMonochrome) {
      return {
        id: 'emoji',
        status: 'unknown',
        score: 0,
        maxScore: 2,
        observed: ['control-not-rendered'],
        reasonKey: 'emojiUnknown',
      }
    }

    const flag = renderText('\u{1F1F9}\u{1F1FC}')
    if (flag.opaquePixelCount < 10 || flag.isMonochrome) {
      return {
        id: 'emoji',
        status: 'match',
        score: 2,
        maxScore: 2,
        observed: ['flag-not-rendered'],
        reasonKey: 'emojiMainlandHint',
      }
    }

    return {
      id: 'emoji',
      status: 'miss',
      score: 0,
      maxScore: 2,
      observed: ['flag-rendered'],
      reasonKey: 'emojiNoHint',
    }
  } catch {
    return {
      id: 'emoji',
      status: 'error',
      score: 0,
      maxScore: 2,
      observed: [],
      reasonKey: 'emojiError',
    }
  }
}

export function detectFontSignal(fontList?: string[]): SignalResult {
  if (typeof document === 'undefined') {
    return {
      id: 'font',
      status: 'unavailable',
      score: 0,
      maxScore: 1,
      observed: [],
      reasonKey: 'fontUnavailable',
    }
  }

  try {
    const fonts = fontList ?? DEFAULT_FONT_LIST
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return {
        id: 'font',
        status: 'unavailable',
        score: 0,
        maxScore: 1,
        observed: [],
        reasonKey: 'fontUnavailable',
      }
    }

    const testText = 'mmmmmmmmmmlli中文测试'
    ctx.font = '72px monospace'
    const baselineWidth = ctx.measureText(testText).width

    const matched: string[] = []
    for (const font of fonts) {
      ctx.font = `72px '${font}', monospace`
      const width = ctx.measureText(testText).width
      if (Math.abs(width - baselineWidth) > 0.5) {
        matched.push(font)
      }
    }

    const isMatch = matched.length > 0
    return {
      id: 'font',
      status: isMatch ? 'match' : 'miss',
      score: isMatch ? 1 : 0,
      maxScore: 1,
      observed: matched,
      reasonKey: isMatch ? 'fontMatched' : 'fontNone',
    }
  } catch {
    return {
      id: 'font',
      status: 'error',
      score: 0,
      maxScore: 1,
      observed: [],
      reasonKey: 'fontError',
    }
  }
}

function probeImage(url: string, timeout: number): Promise<{ reachable: boolean; elapsed: number }> {
  return new Promise(resolve => {
    if (typeof Image === 'undefined') {
      resolve({ reachable: false, elapsed: 0 })
      return
    }
    const start = Date.now()
    const img = new Image()
    let settled = false

    const finish = (reachable: boolean) => {
      if (settled) return
      settled = true
      resolve({ reachable, elapsed: Date.now() - start })
    }

    const timer = setTimeout(() => finish(false), timeout)
    img.onload = () => { clearTimeout(timer); finish(true) }
    img.onerror = () => { clearTimeout(timer); finish(false) }
    img.src = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`
  })
}

export async function runNetworkProbe(options?: NetworkProbeOptions): Promise<NetworkProbeResult> {
  const timeout = options?.timeout ?? 3000
  const blockedUrls = options?.blockedProbeUrls ?? DEFAULT_BLOCKED_PROBE_URLS
  const controlUrls = options?.controlProbeUrls ?? DEFAULT_CONTROL_PROBE_URLS

  const allUrls = [...blockedUrls, ...controlUrls]
  const results = await Promise.all(allUrls.map(url => probeImage(url, timeout)))

  const details = allUrls.map((url, i) => ({
    url,
    reachable: results[i].reachable,
    elapsed: results[i].elapsed,
  }))

  const blockedResults = results.slice(0, blockedUrls.length)
  const controlResults = results.slice(blockedUrls.length)

  const anyBlockedReachable = blockedResults.some(r => r.reachable)
  const anyControlReachable = controlResults.some(r => r.reachable)

  let status: ChinaDetectorStatus
  let reasonKey: string

  if (anyBlockedReachable) {
    status = 'miss'
    reasonKey = 'networkGlobalReachable'
  } else if (anyControlReachable) {
    status = 'match'
    reasonKey = 'networkMainlandHint'
  } else {
    status = 'unknown'
    reasonKey = 'networkBothUnreachable'
  }

  return {
    id: 'network',
    status,
    score: status === 'match' ? 4 : 0,
    maxScore: 4,
    observed: details.filter(d => d.reachable).map(d => d.url),
    reasonKey,
    details,
  }
}
