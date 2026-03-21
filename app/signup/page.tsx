'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')

  async function handleSignup() {
    setMessage('')

    if (!email.trim() || !password.trim()) {
      setMessage('Email and password are required.')
      return
    }

    if (!username.trim()) {
      setMessage('Username is required.')
      return
    }

    if (!displayName.trim()) {
      setMessage('Display name is required.')
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
      setMessage('That username is already taken.')
      return
    }

    setMessage('Creating account...')

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

    window.location.href = '/'
  }

  return (
    <div style={{ padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1>Sign up</h1>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        type="text"
        placeholder="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

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
        onClick={handleSignup}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        Create account
      </button>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  )
}