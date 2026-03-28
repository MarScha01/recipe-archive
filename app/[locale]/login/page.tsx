'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations()
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin() {
    setMessage(t('auth.loggingIn'))

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage(error.message)
      return
    }

    window.location.href = `/${locale}`
  }

  return (
    <div style={{ padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1>{t('auth.login')}</h1>

      <input
        type="email"
        placeholder={t('auth.email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        type="password"
        placeholder={t('auth.password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <button
        onClick={handleLogin}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        {t('auth.login')}
      </button>

      <p style={{ marginTop: '14px' }}>
        <Link href={`/${locale}/forgot-password`}>
          {t('auth.forgotPassword')}
        </Link>
      </p>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  )
}