import { lazy, Suspense } from 'react'

function ToolSkeleton() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="mb-8">
        <div className="h-5 w-16 rounded-full bg-muted mb-3" />
        <div className="h-7 w-48 rounded bg-muted mb-2" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>
      <div className="h-40 rounded-lg bg-muted" />
    </main>
  )
}
import { Routes, Route } from 'react-router-dom'
import { LocaleLayout } from '@/components/layout/LocaleLayout'
import { Home } from '@/pages/Home'
import { AesPage } from '@/pages/AesPage'
import { Md5Page } from '@/pages/Md5Page'
import { Sha2Page } from '@/pages/Sha2Page'
import { Sha3Page } from '@/pages/Sha3Page'
import { BlakePage } from '@/pages/BlakePage'
import { Xxhash3Page } from '@/pages/Xxhash3Page'
import { Base64Page } from '@/pages/Base64Page'
import { Base64ImagePage } from '@/pages/Base64ImagePage'
import { Base58Page } from '@/pages/Base58Page'
import { QrCodePage } from '@/pages/QrCodePage'
import { QrCodeDecodePage } from '@/pages/QrCodeDecodePage'
import { TextDiffPage } from '@/pages/TextDiffPage'
import { JsonFormatPage } from '@/pages/JsonFormatPage'
import { StringLengthPage } from '@/pages/StringLengthPage'
import { PasswordStrengthPage } from '@/pages/PasswordStrengthPage'
import { UglyAvatarPage } from '@/pages/UglyAvatarPage'
import { BpJwtPage } from '@/pages/BpJwtPage'
import { BpSignPage } from '@/pages/BpSignPage'
import { TimestampPage } from '@/pages/TimestampPage'
import { UrlEncodePage } from '@/pages/UrlEncodePage'
import { JwtDecodePage } from '@/pages/JwtDecodePage'
import { ColorPage } from '@/pages/ColorPage'
import { RegexPage } from '@/pages/RegexPage'
import { UuidPage } from '@/pages/UuidPage'
import { RandomStringPage } from '@/pages/RandomStringPage'
import { SupabaseRlsPage } from '@/pages/SupabaseRlsPage'
import { ExifPage } from '@/pages/ExifPage'
import { SensitiveMaskerPage } from '@/pages/SensitiveMaskerPage'
const IdCardPage = lazy(() => import('@/pages/IdCardPage').then(m => ({ default: m.IdCardPage })))
const NameRiskPage = lazy(() => import('@/pages/NameRiskPage').then(m => ({ default: m.NameRiskPage })))
const HeicPage = lazy(() => import('@/pages/HeicPage').then(m => ({ default: m.HeicPage })))
const ZipInspectorPage = lazy(() => import('@/pages/ZipInspectorPage').then(m => ({ default: m.ZipInspectorPage })))
const OcrPage = lazy(() => import('@/pages/OcrPage').then(m => ({ default: m.OcrPage })))
const BgRemovePage = lazy(() => import('@/pages/BgRemovePage').then(m => ({ default: m.BgRemovePage })))
const PayrollCnPage = lazy(() => import('@/pages/PayrollCnPage').then(m => ({ default: m.PayrollCnPage })))
const FlexibleInsurancePage = lazy(() => import('@/pages/FlexibleInsurancePage').then(m => ({ default: m.FlexibleInsurancePage })))
const BeijingGetihuPage = lazy(() => import('@/pages/BeijingGetihuPage').then(m => ({ default: m.BeijingGetihuPage })))
const RestaurantBreakevenPage = lazy(() => import('@/pages/RestaurantBreakevenPage').then(m => ({ default: m.RestaurantBreakevenPage })))
const ImgCompressPage = lazy(() => import('@/pages/ImgCompressPage').then(m => ({ default: m.ImgCompressPage })))
const WordbookPage = lazy(() => import('@/pages/WordbookPage').then(m => ({ default: m.WordbookPage })))
const ChinaUserDetectorPage = lazy(() => import('@/pages/ChinaUserDetectorPage').then(m => ({ default: m.ChinaUserDetectorPage })))
const MarkdownToHtmlPage = lazy(() => import('@/pages/MarkdownToHtmlPage'))
const CpuBenchmarkPage = lazy(() => import('@/pages/CpuBenchmarkPage').then(m => ({ default: m.CpuBenchmarkPage })))

function toolRoutes() {
  return (
    <>
      <Route path="crypto/aes" element={<AesPage />} />
      <Route path="hash/md5" element={<Md5Page />} />
      <Route path="hash/sha2" element={<Sha2Page />} />
      <Route path="hash/sha3" element={<Sha3Page />} />
      <Route path="hash/blake" element={<BlakePage />} />
      <Route path="hash/xxhash3" element={<Xxhash3Page />} />
      <Route path="performance/cpu-benchmark" element={<Suspense fallback={<ToolSkeleton />}><CpuBenchmarkPage /></Suspense>} />
      <Route path="encoding/base64" element={<Base64Page />} />
      <Route path="encoding/base64-image" element={<Base64ImagePage />} />
      <Route path="encoding/base58" element={<Base58Page />} />
      <Route path="encoding/qrcode" element={<QrCodePage />} />
      <Route path="encoding/qrcode-decode" element={<QrCodeDecodePage />} />
      <Route path="text/diff" element={<TextDiffPage />} />
      <Route path="text/json-format" element={<JsonFormatPage />} />
      <Route path="text/string-length" element={<StringLengthPage />} />
      <Route path="security/password-strength" element={<PasswordStrengthPage />} />
      <Route path="random/ugly-avatar" element={<UglyAvatarPage />} />
      <Route path="fun/ugly-avatar" element={<UglyAvatarPage />} />
      <Route path="bp/jwt" element={<BpJwtPage />} />
      <Route path="bp/sign" element={<BpSignPage />} />
      <Route path="text/timestamp" element={<TimestampPage />} />
      <Route path="encoding/url" element={<UrlEncodePage />} />
      <Route path="crypto/jwt" element={<JwtDecodePage />} />
      <Route path="design/color" element={<ColorPage />} />
      <Route path="text/regex" element={<RegexPage />} />
      <Route path="text/id-card" element={<Suspense fallback={<ToolSkeleton />}><IdCardPage /></Suspense>} />
      <Route path="text/name-risk" element={<Suspense fallback={<ToolSkeleton />}><NameRiskPage /></Suspense>} />
      <Route path="random/uuid" element={<UuidPage />} />
      <Route path="random/string" element={<RandomStringPage />} />
      <Route path="fun/uuid" element={<UuidPage />} />
      <Route path="sql/supabase-rls" element={<SupabaseRlsPage />} />
      <Route path="image/exif" element={<ExifPage />} />
      <Route path="security/sensitive-masker" element={<SensitiveMaskerPage />} />
      <Route path="security/china-user-detector" element={<Suspense fallback={<ToolSkeleton />}><ChinaUserDetectorPage /></Suspense>} />
      <Route path="image/heic" element={<Suspense fallback={<ToolSkeleton />}><HeicPage /></Suspense>} />
      <Route path="file/zip-inspector" element={<Suspense fallback={<ToolSkeleton />}><ZipInspectorPage /></Suspense>} />
      <Route path="image/ocr" element={<Suspense fallback={<ToolSkeleton />}><OcrPage /></Suspense>} />
      <Route path="image/compress" element={<Suspense fallback={<ToolSkeleton />}><ImgCompressPage /></Suspense>} />
      <Route path="text/wordbook" element={<Suspense fallback={<ToolSkeleton />}><WordbookPage /></Suspense>} />
      <Route path="text/markdown-to-html" element={<Suspense fallback={<ToolSkeleton />}><MarkdownToHtmlPage /></Suspense>} />
      <Route path="image/bg-remove" element={<Suspense fallback={<ToolSkeleton />}><BgRemovePage /></Suspense>} />
      <Route path="finance/social-insurance" element={<Suspense fallback={<ToolSkeleton />}><PayrollCnPage /></Suspense>} />
      <Route path="finance/flexible-insurance" element={<Suspense fallback={<ToolSkeleton />}><FlexibleInsurancePage /></Suspense>} />
      <Route path="finance/beijing-getihu" element={<Suspense fallback={<ToolSkeleton />}><BeijingGetihuPage /></Suspense>} />
      <Route path="finance/restaurant-breakeven" element={<Suspense fallback={<ToolSkeleton />}><RestaurantBreakevenPage /></Suspense>} />
    </>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* English (default, no prefix) */}
      <Route element={<LocaleLayout locale="en" />}>
        <Route index element={<Home />} />
        {toolRoutes()}
      </Route>

      {/* Other locales (/:locale prefix) */}
      <Route path="/:locale" element={<LocaleLayout />}>
        <Route index element={<Home />} />
        {toolRoutes()}
        <Route path="*" element={<Home />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  )
}
