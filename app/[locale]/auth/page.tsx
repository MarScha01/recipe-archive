'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useTranslations, useLocale } from 'next-intl'

export default function AuthPage() {
  const t = useTranslations()
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  async function signUp() {
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

    setMessage(t('auth.signingUp'))

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
    } else {
      setMessage(t('auth.signupSuccess'))
      checkUser()
    }
  }

  async function signIn() {
    setMessage(t('auth.signingIn'))

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage(t('auth.loggedIn'))
      checkUser()
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setMessage(t('auth.loggedOut'))
  }

  return (
    <div style={{ padding: 40, maxWidth: 440, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>{t('auth.title')}</h1>

      {user ? (
        <div>
          <p style={{ marginBottom: 10 }}>
            {t('auth.loggedInAs')}: {user.email}
          </p>

          <button onClick={signOut} style={{ padding: '10px 20px' }}>
            {t('auth.logout')}
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder={t('auth.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <input
            type="text"
            placeholder={t('auth.displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={signUp} style={{ padding: '10px 20px' }}>
              {t('auth.signUp')}
            </button>

            <button onClick={signIn} style={{ padding: '10px 20px' }}>
              {t('auth.login')}
            </button>
          </div>
        </div>
      )}

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  )
}