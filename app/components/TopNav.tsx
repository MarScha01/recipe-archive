'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLocale, useTranslations } from 'next-intl'
import LocaleSwitcher from './LocaleSwitcher'

export default function TopNav() {
  const t = useTranslations()
  const locale = useLocale()

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
        setDisplayName(
          profile.display_name ||
          profile.username ||
          user.email ||
          t('nav.profile')
        )
      } else {
        setDisplayName(user.email || t('nav.profile'))
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
  }, [t])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
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
              <Link href={`/${locale}`}>{t('nav.recipes')}</Link>
              <Link href={`/${locale}/find`}>{t('nav.findByIngredient')}</Link>
              <Link href={`/${locale}/add`}>{t('nav.addRecipe')}</Link>
              <Link href={`/${locale}/meal-planner`}>{t('nav.mealPlanner')}</Link>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <LocaleSwitcher />

              {currentUser ? (
                <>
                  <Link
                    href={`/${locale}/profile`}
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
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href={`/${locale}/login`}>{t('nav.login')}</Link>
                  <Link href={`/${locale}/signup`}>{t('nav.signUp')}</Link>
                </>
              )}
            </div>
          </div>
        </div>

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
              href={`/${locale}`}
              onClick={closeMenu}
              style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '22px',
                fontWeight: 700
              }}
            >
              {t('nav.recipes')}
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t('nav.openMenu')}
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
              <div style={{ marginBottom: '4px' }}>
                <LocaleSwitcher onSelect={closeMenu} />
              </div>

              <Link href={`/${locale}`} onClick={closeMenu}>
                {t('nav.recipes')}
              </Link>
              <Link href={`/${locale}?favorites=1`} onClick={closeMenu}>
                {t('nav.favoriteRecipes')}
              </Link>
              <Link href={`/${locale}/find`} onClick={closeMenu}>
                {t('nav.findByIngredient')}
              </Link>
              <Link href={`/${locale}/add`} onClick={closeMenu}>
                {t('nav.addRecipe')}
              </Link>
              <Link href={`/${locale}/meal-planner`} onClick={closeMenu}>
                {t('nav.mealPlanner')}
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
                  <Link href={`/${locale}/profile`} onClick={closeMenu}>
                    {displayName || t('nav.profile')}
                  </Link>

                  <Link href={`/${locale}/account`} onClick={closeMenu}>
                    {t('nav.accountSettings')}
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
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href={`/${locale}/login`} onClick={closeMenu}>
                    {t('nav.login')}
                  </Link>
                  <Link href={`/${locale}/signup`} onClick={closeMenu}>
                    {t('nav.signUp')}
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