'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useLocale, useTranslations } from 'next-intl'

function isValidPassword(password: string) {
  const hasMinLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  return hasMinLength && hasLetter && hasNumber
}

export default function ResetPasswordPage() {
  const t = useTranslations()
  const locale = useLocale()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setMessage(t('auth.couldNotVerifyResetSession'))
        return
      }

      if (data.session) {
        setReady(true)
      } else {
        setMessage(t('auth.resetLinkInvalid'))
      }
    }

    checkSession()
  }, [t])

  async function handleResetPassword() {
    setMessage('')

    if (!password || !confirmPassword) {
      setMessage(t('account.fillBothPasswordFields'))
      return
    }

    if (!isValidPassword(password)) {
      setMessage(t('account.passwordRules'))
      return
    }

    if (password !== confirmPassword) {
      setMessage(t('account.passwordsDoNotMatch'))
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      setMessage(`Password reset error: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage(t('auth.passwordResetSuccess'))
    setLoading(false)
    setPassword('')
    setConfirmPassword('')

    await supabase.auth.signOut()
    window.location.href = `/${locale}/login`
  }

  return (
    <div style={{ padding: 40, maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>{t('auth.resetPasswordTitle')}</h1>

      {!ready && !message && <p>{t('auth.checkingResetLink')}</p>}

      {ready && (
        <>
          <input
            type="password"
            placeholder={t('account.newPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              borderRadius: '8px'
            }}
          />

          <input
            type="password"
            placeholder={t('account.confirmNewPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            onClick={handleResetPassword}
            disabled={loading}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {loading ? t('auth.saving') : t('auth.saveNewPassword')}
          </button>
        </>
      )}

      {message && (
        <p style={{ marginTop: '16px' }}>
          {message}
        </p>
      )}
    </div>
  )
}