'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthPage() {
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

    setMessage('Signing up...')

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
      setMessage('Signup successful.')
      checkUser()
    }
  }

  async function signIn() {
    setMessage('Signing in...')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Logged in!')
      checkUser()
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setMessage('Logged out')
  }

  return (
    <div style={{ padding: 40, maxWidth: 440, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>Account</h1>

      {user ? (
        <div>
          <p style={{ marginBottom: 10 }}>Logged in as: {user.email}</p>

          <button onClick={signOut} style={{ padding: '10px 20px' }}>
            Log out
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', marginBottom: 10, padding: 8, width: '100%' }}
          />

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={signUp} style={{ padding: '10px 20px' }}>
              Sign up
            </button>

            <button onClick={signIn} style={{ padding: '10px 20px' }}>
              Log in
            </button>
          </div>
        </div>
      )}

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  )
}