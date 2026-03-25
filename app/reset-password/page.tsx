'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function isValidPassword(password: string) {
  const hasMinLength = password.length >= 8
  const hasLetter = / [a-ZA-Z]/test(password)
  const hasNumber = / [0-9]/.test(password)

  return hasMinLength && hasLetter && hasNumber
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setMessage('Could not verify reset session.')
        return
      }

      if (data.session) {
        setReady(true)
      } else {
        setMessage('This reset link is invalid or expired.')
      }
    }

    checkSession()
  }, [])

  async function handleResetPassword() {
    setMessage('')

    if (!password || !confirmPassword) {
      setMessage('Fill in both password fields.')
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters and include a letter and number.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
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

    setMessage('Password updated successfully. You can now log in with your new password.')
    setLoading(false)
    setPassword('')
    setConfirmPassword('')

    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ padding: 40, maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Reset password</h1>

      {!ready && !message && <p>Checking reset link...</p>}

      {ready && (
        <>
          <input
            type="password"
            placeholder="New password"
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
            placeholder="Confirm new password"
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
            {loading ? 'Saving...' : 'Save new password'}
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