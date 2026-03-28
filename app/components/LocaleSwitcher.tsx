'use client'

import {useState} from 'react'
import {useLocale, useTranslations} from 'next-intl'
import {usePathname, useRouter} from '../../navigation'

const locales = [
  {code: 'en', label: 'EN'},
  {code: 'nl', label: 'NL'},
  {code: 'de', label: 'DE'},
  {code: 'lt', label: 'LT'}
] as const

type Props = {
  onSelect?: () => void
}

export default function LocaleSwitcher({onSelect}: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const current = locales.find((item) => item.code === locale) ?? locales[0]

  function handleToggle() {
    setOpen((prev) => !prev)
  }

  function handleSelect(nextLocale: string) {
    setOpen(false)
    onSelect?.()
    router.replace(pathname, {locale: nextLocale})
  }

  return (
    <div style={{position: 'relative'}}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={t('language.switchLanguage')}
        title={t('language.switchLanguage')}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #333',
          background: '#1a1a1a',
          color: 'white',
          cursor: 'pointer',
          minWidth: '64px'
        }}
      >
        {current.label}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '84px',
            background: '#111',
            border: '1px solid #333',
            borderRadius: '10px',
            overflow: 'hidden',
            zIndex: 300
          }}
        >
          {locales.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item.code)}
              disabled={item.code === locale}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                background: item.code === locale ? '#222' : '#111',
                color: 'white',
                cursor: item.code === locale ? 'default' : 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}