'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useLocale, useTranslations } from 'next-intl'

function isValidPassword(password: string) {
  const hasMinLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  return hasMinLength && hasLetter && hasNumber
}

export default function SignupPage() {
  const t = useTranslations()
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')

  async function handleSignup() {
    setMessage('')

    if (!email.trim() || !password.trim()) {
      setMessage(t('auth.emailPasswordRequired'))
      return
    }

    if (!username.trim()) {
      setMessage(t('auth.usernameRequired'))
      return
    }

    if (!displayName.trim()) {
      setMessage(t('auth.displayNameRequired'))
      return
    }

    const normalizedUsername = username.trim().toLowerCase()

    const { data: existingUser, error: usernameCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle()

    if (usernameCheckError) {
      setMessage(`Username check error: ${usernameCheckError.message}`)
      return
    }

    if (existingUser) {
      setMessage(t('auth.usernameTaken'))
      return
    }

    if (!isValidPassword(password)) {
      setMessage(t('auth.passwordRules'))
      return
    }

    setMessage(t('auth.creatingAccount'))

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: displayName.trim()
        }
      }
    })

    if (error) {
      setMessage(error.message)
      return
    }

    window.location.href = `/${locale}`
  }

  return (
    <div style={{ padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1>{t('auth.signup')}</h1>

      <input
        type="text"
        placeholder={t('auth.username')}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        type="text"
        placeholder={t('auth.displayName')}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

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

      <p style={{ fontSize: '12px', color: "#aaa", marginTop: '4px' }}>
        {t('auth.passwordHint')}
      </p>

      <button
        onClick={handleSignup}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        {t('auth.createAccount')}
      </button>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  )
}