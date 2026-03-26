'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

function isValidPassword(password: string) {
  const hasMinLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  return hasMinLength && hasLetter && hasNumber
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [message, setMessage] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    loadAccount()
  }, [])

  async function loadAccount() {
    setLoading(true)
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setMessage('You must be logged in to view this page.')
      setLoading(false)
      return
    }

    const currentUser = authData.user
    setUser(currentUser)
    setNewEmail('')

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profileError) {
      setMessage(`Profile load error: ${profileError.message}`)
      setLoading(false)
      return
    }

    setUsername(profileData?.username || '')
    setDisplayName(profileData?.display_name || '')
    setAvatarUrl(profileData?.avatar_url || '')

    setLoading(false)
  }

  async function saveProfileInfo() {
    if (!user) return

    setMessage('')

    const cleanedUsername = username.trim().toLowerCase()
    const cleanedDisplayName = displayName.trim()

    if (!cleanedUsername) {
      setMessage('Username is required.')
      return
    }

    if (!cleanedDisplayName) {
      setMessage('Display name is required.')
      return
    }

    const { data: existingUser, error: usernameCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanedUsername)
      .neq('id', user.id)
      .maybeSingle()

    if (usernameCheckError) {
      setMessage(`Username check error: ${usernameCheckError.message}`)
      return
    }

    if (existingUser) {
      setMessage('That username is already taken.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: cleanedUsername,
        display_name: cleanedDisplayName
      })
      .eq('id', user.id)

    if (error) {
      setMessage(`Profile update error: ${error.message}`)
      return
    }

    setMessage('Profile updated successfully.')
  }

  function resizeImage(file: File, maxWidth = 600, quality = 0.85) {
    return new Promise<Blob>((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (event) => {
        const result = event.target?.result
        if (typeof result !== 'string') {
          reject(new Error('Failed to read image file'))
          return
        }
        img.src = result
      }

      reader.onerror = () => reject(new Error('Failed to read image file'))

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not create image canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'))
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      reader.readAsDataURL(file)
    })
  }

  async function uploadAvatar(file?: File) {
    if (!file || !user) return

    setUploadingAvatar(true)
    setMessage('')

    if (!file.type.startsWith('image/')) {
      setMessage('Only image files are allowed.')
      setUploadingAvatar(false)
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Avatar must be smaller than 2 MB.')
      setUploadingAvatar(false)
      return
    }

    try {
      const resizedBlob = await resizeImage(file)
      const filePath = `${user.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) {
        setMessage(`Avatar upload error: ${uploadError.message}`)
        setUploadingAvatar(false)
        return
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (profileError) {
        setMessage(`Avatar save error: ${profileError.message}`)
        setUploadingAvatar(false)
        return
      }

      setAvatarUrl('${publicUrl}?t=${Date.now()}')
      setMessage('Avatar updated successfully.')
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown avatar error'
      setMessage(`Avatar error: ${errMessage}`)
    }

    setUploadingAvatar(false)
  }

  async function removeAvatar() {
    if (!user) return

    setUploadingAvatar(true)
    setMessage('')

    const filePath = '${user.id}/avatar.jpg'

    await supabase.storage
      .from('avatars')
      .remove([filePath])

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)

    if (error) {
      setMessage(`Remove avatar error: ${error.message}`)
      setUploadingAvatar(false)
      return
    }

    setAvatarUrl('')
    setMessage('Avatar removed successfully.')
    setUploadingAvatar(false)
  }

  async function changeEmail() {
    setMessage('')

    if (!newEmail.trim()) {
      setMessage('Email is required.')
      return
    }

    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim()
    })

    if (error) {
      setMessage(`Email update error: ${error.message}`)
      return
    }

    setMessage('Email update requested. Please check your inbox to confirm the new email address.')
  }

  async function changePassword() {
    setMessage('')

    if (!newPassword || !confirmPassword) {
      setMessage('Fill in both password fields.')
      return
    }

    if (!isValidPassword(newPassword)) {
      setMessage('Password must be at least 8 characters and include a letter and a number.')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setMessage(`Password update error: ${error.message}`)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setMessage('Password updated successfully.')
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading account...</div>
  }

  if (!user) {
    return (
      <div style={{ padding: 40, maxWidth: '700px', margin: '0 auto' }}>
        <p>You must be logged in to view this page.</p>
        <Link href="/login">Go to login</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, maxWidth: '700px', margin: '0 auto' }}>
      <Link href="/profile" style={{ display: 'block', marginBottom: '20px' }}>
        ← Back to profile
      </Link>

      <h1 style={{ marginBottom: '24px' }}>Account settings</h1>

      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ marginBottom: '12px' }}>Profile info</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px' }}
        />

        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px' }}
        />

        <button
          type="button"
          onClick={saveProfileInfo}
          style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Save profile info
        </button>
      </div>

      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ marginBottom: '12px' }}>Avatar</h2>

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{
              width: '110px',
              height: '110px',
              objectFit: 'cover',
              borderRadius: '999px',
              display: 'block',
              marginBottom: '12px'
            }}
          />
        ) : (
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '999px',
              background: '#222',
              border: '1px solid #333',
              marginBottom: '12px'
            }}
          />
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => uploadAvatar(e.target.files?.[0])}
          style={{ display: 'block', marginBottom: '12px' }}
        />

        {uploadingAvatar && <p>Uploading avatar...</p>}

        <button
          type="button"
          onClick={removeAvatar}
          style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Remove avatar
        </button>
      </div>

      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ marginBottom: '12px' }}>Email</h2>

        <input
          type="email"
          placeholder="New email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px' }}
        />

        <button
          type="button"
          onClick={changeEmail}
          style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Change email
        </button>
      </div>

      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ marginBottom: '12px' }}>Password</h2>

        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px' }}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px' }}
        />

        <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px', marginBottom: '12px' }}>
          At least 8 characters, with a letter and a number.
        </p>

        <button
          type="button"
          onClick={changePassword}
          style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Change password
        </button>
      </div>

      {message && <p style={{ marginTop: '16px' }}>{message}</p>}
    </div>
  )
}