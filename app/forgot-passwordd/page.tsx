'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResetRequest() {
    setMessage('')

    if (!email.trim()) {
      setMessage('Enter your email address.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      setMessage(`Reset request error: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage('If that email exists, a password reset link has been sent.')
    setLoading(false)
  }

  return (
    <div style={{ padding: 40, maxWidth: '500px', margin: '0 auto' }}>
      <Link href="/login" style={{ display: 'block', marginBottom: '20px' }}>
        ← Back to login
      </Link>

      <h1 style={{ marginBottom: '20px' }}>Forgot password</h1>

      <input
        type="email"
        placeholder="Your email address"
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
        {loading ? 'Sending...' : 'Send reset email'}
      </button>

      {message && (
        <p style={{ marginTop: '16px' }}>
          {message}
        </p>
      )}
    </div>
  )
}