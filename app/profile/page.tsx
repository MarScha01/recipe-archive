'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data } = await supabase.auth.getUser()
    const currentUser = data.user
    setUser(currentUser)

    if (!currentUser) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle()

    setProfile(profileData)
  }

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <p>You are not logged in.</p>
        <Link href="/login">Login</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, maxWidth: '700px', margin: '0 auto' }}>
      <h1>Profile</h1>

      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Username:</strong> {profile?.username || '-'}</p>
      <p><strong>Display name:</strong> {profile?.display_name || '-'}</p>
    </div>
  )
}