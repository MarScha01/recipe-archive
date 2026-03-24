'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin() {
    setMessage('Logging in...')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage(error.message)
      return
    }

    window.location.href = '/'
  }

  return (
    <div style={{ padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        type="password"
        placeholder="Password"
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
        Login
      </button>

      <p style={{ marginTop: '14px' }}>
        <Link href="/forgot-password">
          Forgot password?
        </Link>
      </p>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  )
}