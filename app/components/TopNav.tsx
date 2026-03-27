'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function TopNav() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

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

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#111',
        borderBottom: '1px solid #333',
        padding: '16px 20px',
        marginBottom: '20px'
      }}
    >
      <div
        style={{
          maxWidth: '1300px',
          margin: '0 auto'
        }}
      >
        {/* Desktop nav */}
        <div className="desktop-nav">
          <div
            style={{
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
              <Link href="/meal-planner">Meal planner</Link>
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

        {/* Mobile nav */}
        <div className="mobile-nav">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <Link
              href="/"
              onClick={closeMenu}
              style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '22px',
                fontWeight: 700
              }}
            >
              Recipes
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                color: 'white',
                borderRadius: '8px',
                width: '44px',
                height: '44px',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ☰
            </button>
          </div>

          {menuOpen && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: '1px solid #333'
              }}
            >
              <Link href="/" onClick={closeMenu}>
                Recipes
              </Link>
              <Link href="/?favorites=1" onClick={closeMenu}>
                Favorite recipes
              </Link>
              <Link href="/find" onClick={closeMenu}>
                Find by ingredient
              </Link>
              <Link href="/add" onClick={closeMenu}>
                Add recipe
              </Link>
              <Link href="/meal-planner" onClick={closeMenu}>
                Meal planner
              </Link>

              <div
                style={{
                  height: '1px',
                  background: '#333',
                  margin: '4px 0'
                }}
              />

              {currentUser ? (
                <>
                  <Link href="/profile" onClick={closeMenu}>
                    {displayName || 'Profile'}
                  </Link>
                  
                  <Link href="/account" onClick={() => setMenuOpen(false)}>
                    Account settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMenu}>
                    Login
                  </Link>
                  <Link href="/signup" onClick={closeMenu}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        a {
          color: white;
          text-decoration: none;
        }

        a:hover {
          opacity: 0.85;
        }

        .desktop-nav {
          display: block;
        }

        .mobile-nav {
          display: none;
        }

        @media (max-width: 768px) {
          .desktop-nav {
            display: none;
          }

          .mobile-nav {
            display: block;
          }
        }
      `}</style>
    </div>
  )
}