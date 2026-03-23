'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'recipe_archive_cookie_consent_v1'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY)
    if (!savedConsent) {
      setVisible(true)
    }
  }, [])

  function acceptCookies() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    window.dispatchEvent(new Event('cookie-consent-updated'))
  }

  function rejectCookies() {
    localStorage.setItem(CONSENT_KEY, 'rejected')
    setVisible(false)
    window.dispatchEvent(new Event('cookie-consent-updated'))
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        zIndex: 9999,
        background: '#111',
        border: '1px solid #333',
        borderRadius: '14px',
        padding: '16px',
        boxShadow: '0 10px 24px rgba(0,0,0,0.35)'
      }}
    >
      <p style={{ marginTop: 0, marginBottom: '12px', color: 'white' }}>
        Recipe Archive uses necessary cookies for login and site functionality. Optional analytics
        will only be used if you accept them.
      </p>

      <p style={{ marginTop: 0, marginBottom: '16px' }}>
        <Link href="/privacy" style={{ color: '#9ecbff' }}>
          Read Privacy & cookies
        </Link>
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={acceptCookies}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #333',
            background: '#2c2c2c',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Accept all cookies
        </button>

        <button
          type="button"
          onClick={rejectCookies}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Reject optional cookies
        </button>
      </div>
    </div>
  )
}