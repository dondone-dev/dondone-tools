import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
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
import { StringLengthPage } from '@/pages/StringLengthPage'
import { PasswordStrengthPage } from '@/pages/PasswordStrengthPage'
import { UglyAvatarPage } from '@/pages/UglyAvatarPage'
import { BpJwtPage } from '@/pages/BpJwtPage'
import { BpSignPage } from '@/pages/BpSignPage'
import { TOOLS } from '@/lib/tools-config'

function AppLayout() {
  const { pathname } = useLocation()
  const tool = TOOLS.find((t) => t.href === pathname)
  const breadcrumbs = tool ? [{ label: tool.category }, { label: tool.title }] : undefined

  return (
    <div className="min-h-screen bg-background">
      <Header breadcrumbs={breadcrumbs} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/crypto/aes" element={<AesPage />} />
        <Route path="/hash/md5" element={<Md5Page />} />
        <Route path="/hash/sha2" element={<Sha2Page />} />
        <Route path="/hash/sha3" element={<Sha3Page />} />
        <Route path="/hash/blake" element={<BlakePage />} />
        <Route path="/hash/xxhash3" element={<Xxhash3Page />} />
        <Route path="/encoding/base64" element={<Base64Page />} />
        <Route path="/encoding/base64-image" element={<Base64ImagePage />} />
        <Route path="/encoding/base58" element={<Base58Page />} />
        <Route path="/encoding/qrcode" element={<QrCodePage />} />
        <Route path="/text/string-length" element={<StringLengthPage />} />
        <Route path="/security/password-strength" element={<PasswordStrengthPage />} />
        <Route path="/fun/ugly-avatar" element={<UglyAvatarPage />} />
        <Route path="/bp/jwt" element={<BpJwtPage />} />
        <Route path="/bp/sign" element={<BpSignPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
