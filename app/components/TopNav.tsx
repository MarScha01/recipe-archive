'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function TopNav() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      const user = data.user || null

      if (!mounted) return

      setCurrentUser(user)

      if (!user) {
        setDisplayName('')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle()

      if (!mounted) return

      if (profile) {
        setDisplayName(profile.display_name || profile.username || user.email || 'Profile')
      } else {
        setDisplayName(user.email || 'Profile')
      }
    }

    loadUser()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#111',
        borderBottom: '1px solid #333',
        padding: '16px 40px',
        marginBottom: '20px'
      }}
    >
      <div
        style={{
          maxWidth: '1300px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <Link href="/">Recipes</Link>
          <Link href="/find">Find by ingredient</Link>
          <Link href="/add">Add recipe</Link>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          {currentUser ? (
            <>
              <Link
                href="/profile"
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#1a1a1a',
                  color: 'white',
                  textDecoration: 'none'
                }}
              >
                {displayName}
              </Link>

              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#1a1a1a',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}