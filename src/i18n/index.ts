import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { LOCALES, DEFAULT_LOCALE } from './config'

import enCommon from './locales/en/common.json'
import enTools from './locales/en/tools.json'
import zhCommon from './locales/zh/common.json'
import zhTools from './locales/zh/tools.json'
import jaCommon from './locales/ja/common.json'
import jaTools from './locales/ja/tools.json'
import frCommon from './locales/fr/common.json'
import frTools from './locales/fr/tools.json'
import koCommon from './locales/ko/common.json'
import koTools from './locales/ko/tools.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, tools: enTools },
      zh: { common: zhCommon, tools: zhTools },
      ja: { common: jaCommon, tools: jaTools },
      fr: { common: frCommon, tools: frTools },
      ko: { common: koCommon, tools: koTools },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: LOCALES,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred-locale',
    },
  })

export default i18n
