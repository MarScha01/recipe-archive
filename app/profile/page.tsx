'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { slugify } from '../../lib/slugify'

/**
 * Profile data from your "profiles" table
 */
type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

/**
 * Recipe data from your "Recipes" table
 */
type Recipe = {
  id: number
  Name: string
  Category: string
  Prep_time: number | null
  Cook_time: number | null
  Image_url: string | null
}

export default function ProfilePage() {
  /**
   * Logged in user
   */
  const [user, setUser] = useState<User | null>(null)

  /**
   * Profile row from "profiles"
   */
  const [profile, setProfile] = useState<Profile | null>(null)

  /**
   * User's own recipes
   */
  const [recipes, setRecipes] = useState<Recipe[]>([])

  /**
   * Number of recipes this user has favorited
   */
  const [favoritesCount, setFavoritesCount] = useState(0)

  /**
   * Favorite count per recipe
   */
  const [recipeFavoriteCounts, setRecipeFavoriteCounts] = useState<Record<number, number>>({})

  /**
   * Error/info message
   */
  const [message, setMessage] = useState('')

  /**
   * Window width for switching mobile/desktop layout
   */
  const [windowWidth, setWindowWidth] = useState(1200)

  /**
   * Mobile breakpoint
   */
  const isMobile = windowWidth < 640

  /**
   * On load:
   * - load profile page data
   * - listen for screen resize
   */
  useEffect(() => {
    loadProfilePage()

    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /**
   * Build avatar URL safely.
   * Adds a cache-busting query so updated avatars actually refresh.
   */
  const avatarSrc = useMemo(() => {
    if (!profile?.avatar_url) return null

    const separator = profile.avatar_url.includes('?') ? '&' : '?'
    return `${profile.avatar_url}${separator}v=${encodeURIComponent(profile.avatar_url)}`
  }, [profile?.avatar_url])

  /**
   * Load:
   * - auth user
   * - profile row
   * - recipes
   * - total favorited count
   * - favorite count per recipe
   */
  async function loadProfilePage() {
    setMessage('')

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      setMessage(`Auth error: ${authError.message}`)
      return
    }

    setUser(currentUser)

    if (!currentUser) return

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profileError) {
      setMessage(`Profile error: ${profileError.message}`)
      return
    }

    setProfile(profileData)

    const { data: recipeData, error: recipeError } = await supabase
      .from('Recipes')
      .select('id, Name, Category, Prep_time, Cook_time, Image_url')
      .eq('user_id', currentUser.id)
      .order('id', { ascending: false })

    if (recipeError) {
      setMessage(`Recipe load error: ${recipeError.message}`)
      return
    }

    const loadedRecipes = recipeData || []
    setRecipes(loadedRecipes)

    const { count, error: favoritesError } = await supabase
      .from('recipe_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)

    if (favoritesError) {
      setMessage(`Favorites error: ${favoritesError.message}`)
      return
    }

    setFavoritesCount(count || 0)

    if (loadedRecipes.length > 0) {
      const recipeIds = loadedRecipes.map((recipe) => recipe.id)

      const { data: favoriteRows, error: recipeFavoriteError } = await supabase
        .from('recipe_favorites')
        .select('recipe_id')
        .in('recipe_id', recipeIds)

      if (recipeFavoriteError) {
        setMessage(`Recipe favorites error: ${recipeFavoriteError.message}`)
        return
      }

      const counts: Record<number, number> = {}

      recipeIds.forEach((id) => {
        counts[id] = 0
      })

      ;(favoriteRows || []).forEach((row: { recipe_id: number }) => {
        counts[row.recipe_id] = (counts[row.recipe_id] || 0) + 1
      })

      setRecipeFavoriteCounts(counts)
    } else {
      setRecipeFavoriteCounts({})
    }
  }

  /**
   * If user is not logged in
   */
  if (!user) {
    return (
      <div
        style={{
          padding: isMobile ? '96px 20px 20px' : '40px',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <p>You are not logged in.</p>
        <Link href="/login">Login</Link>
      </div>
    )
  }

  /**
   * Fallback display name logic
   */
  const displayName = profile?.display_name || profile?.username || 'Profile'

  /**
   * Show username nicely if available
   */
  const usernameText = profile?.username ? `@${profile.username}` : 'No username yet'

  return (
    <div
      style={{
        padding: isMobile ? '96px 20px 20px' : '40px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {/* =========================
          PROFILE HEADER CARD
         ========================= */}
      <div
        style={{
          position: 'relative',
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          padding: isMobile ? '76px 20px 20px' : '28px',
          marginBottom: '28px',
          overflow: 'visible',
        }}
      >
        {/* =========================
            MOBILE LAYOUT
            No edit controls here
           ========================= */}
        {isMobile ? (
          <>
            {/* Floating avatar
                pointerEvents: none prevents it from blocking the hamburger/nav taps
             */}
            <div
              style={{
                position: 'absolute',
                top: '-44px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #444',
                  background: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                }}
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '30px', color: '#888' }}>👤</span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h1
                style={{
                  marginTop: 0,
                  marginBottom: '8px',
                  fontSize: '32px',
                  wordBreak: 'break-word',
                }}
              >
                {displayName}
              </h1>

              <p style={{ margin: '0 0 18px 0', color: '#aaa' }}>{usernameText}</p>

              {/* Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                  maxWidth: '320px',
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '14px 12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px' }}>Created</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{recipes.length}</div>
                </div>

                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '14px 12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px' }}>Favorited</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{favoritesCount}</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* =========================
             DESKTOP LAYOUT
             Account settings button only
             ========================= */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: '28px',
              alignItems: 'center',
            }}
          >
            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #444',
                  background: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                }}
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '48px', color: '#888' }}>👤</span>
                )}
              </div>
            </div>

            {/* Info */}
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  marginTop: 0,
                  marginBottom: '8px',
                  fontSize: '40px',
                }}
              >
                {displayName}
              </h1>

              <p style={{ margin: '0 0 18px 0', color: '#aaa' }}>{usernameText}</p>

              {/* Stats */}
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  flexWrap: 'wrap',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    minWidth: '160px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px' }}>Created</div>
                  <div style={{ fontSize: '30px', fontWeight: 700 }}>{recipes.length}</div>
                </div>

                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    minWidth: '160px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px' }}>Favorited</div>
                  <div style={{ fontSize: '30px', fontWeight: 700 }}>{favoritesCount}</div>
                </div>
              </div>

              {/* Desktop-only account settings button */}
              <Link
                href="/account"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  color: '#fff',
                  background: '#222',
                  border: '1px solid #444',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontWeight: 600,
                }}
              >
                Account settings
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* =========================
          RECIPE SECTION TITLE
         ========================= */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ margin: 0 }}>My recipes</h2>
      </div>

      {/* =========================
          EMPTY STATE OR RECIPE GRID
         ========================= */}
      {recipes.length === 0 ? (
        <p style={{ color: '#aaa' }}>You have not created any recipes yet.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: '16px',
          }}
        >
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipe/${recipe.id}-${slugify(recipe.Name)}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  position: 'relative',
                  border: '1px solid #2a2a2a',
                  borderRadius: '12px',
                  background: '#1a1a1a',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                  }}
                >
                  {/* Image or placeholder */}
                  {recipe.Image_url ? (
                    <img
                      src={recipe.Image_url}
                      alt={recipe.Name}
                      style={{
                        width: isMobile ? '84px' : '110px',
                        height: isMobile ? '84px' : '110px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        flexShrink: 0,
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: isMobile ? '84px' : '110px',
                        height: isMobile ? '84px' : '110px',
                        background: '#222',
                        border: '1px solid #333',
                        borderRadius: '10px',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Text */}
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '56px' }}>
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: '8px',
                        fontSize: isMobile ? '20px' : '24px',
                        fontWeight: 700,
                        lineHeight: 1.15,
                      }}
                    >
                      {recipe.Name}
                    </h3>

                    <div
                      style={{
                        color: '#cfcfcf',
                        fontSize: isMobile ? '14px' : '15px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>{recipe.Category}</div>
                      <div>Prep {recipe.Prep_time ?? '-'} min</div>
                      <div>Cook {recipe.Cook_time ?? '-'} min</div>
                    </div>
                  </div>

                  {/* Favorite badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      background: '#111',
                      border: '1px solid #333',
                      color: '#d8d8d8',
                      fontSize: isMobile ? '14px' : '15px',
                      lineHeight: 1,
                    }}
                  >
                    <span>★</span>
                    <span>{recipeFavoriteCounts[recipe.id] || 0}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Page message */}
      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  )
}