'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useLocale, useTranslations } from 'next-intl'

export default function ForgotPasswordPage() {
  const t = useTranslations()
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResetRequest() {
    setMessage('')

    if (!email.trim()) {
      setMessage(t('auth.enterEmail'))
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/${locale}/reset-password`
    })

    if (error) {
      setMessage(`Reset request error: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage(t('auth.resetEmailSent'))
    setLoading(false)
  }

  return (
    <div style={{ padding: 40, maxWidth: '500px', margin: '0 auto' }}>
      <Link href={`/${locale}/login`} style={{ display: 'block', marginBottom: '20px' }}>
        ← {t('auth.backToLogin')}
      </Link>

      <h1 style={{ marginBottom: '20px' }}>{t('auth.forgotPasswordTitle')}</h1>

      <input
        type="email"
        placeholder={t('auth.yourEmailAddress')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px',
          marginBottom: '16px',
          borderRadius: '8px'
        }}
      />

      <button
        type="button"
        onClick={handleResetRequest}
        disabled={loading}
        style={{
          padding: '10px 18px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        {loading ? t('auth.sending') : t('auth.sendResetEmail')}
      </button>

      {message && (
        <p style={{ marginTop: '16px' }}>
          {message}
        </p>
      )}
    </div>
  )
}