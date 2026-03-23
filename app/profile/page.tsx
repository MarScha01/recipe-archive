'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { slugify } from '../../lib/slugify'

type Profile = {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

type Recipe = {
  id: number
  Name: string
  Category: string
  Prep_time: number | null
  Cook_time: number | null
  Image_url?: string | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [recipeFavoriteCounts, setRecipeFavoriteCounts] = useState<Record<number, number>>({})
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [windowWidth, setWindowWidth] = useState(1200)

  const isMobile = windowWidth < 640

  useEffect(() => {
    loadProfilePage()

    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function loadProfilePage() {
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) {
      setMessage(`Auth error: ${authError.message}`)
      return
    }

    const currentUser = authData.user
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

      ;(favoriteRows || []).forEach((row: any) => {
        counts[row.recipe_id] = (counts[row.recipe_id] || 0) + 1
      })

      setRecipeFavoriteCounts(counts)
    } else {
      setRecipeFavoriteCounts({})
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file || !user) return

    setUploading(true)
    setMessage('')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setMessage(`Avatar upload error: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const avatarUrl = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (updateError) {
      setMessage(`Avatar save error: ${updateError.message}`)
      setUploading(false)
      return
    }

    setProfile((prev) =>
      prev
        ? { ...prev, avatar_url: avatarUrl }
        : {
            id: user.id,
            username: null,
            display_name: null,
            avatar_url: avatarUrl
          }
    )

    setUploading(false)
  }

  if (!user) {
    return (
      <div style={{ padding: isMobile ? 20 : 40, maxWidth: '900px', margin: '0 auto' }}>
        <p>You are not logged in.</p>
        <Link href="/login">Login</Link>
      </div>
    )
  }

  const displayName = profile?.display_name || profile?.username || 'Profile'

  return (
    <div
      style={{
        padding: isMobile ? 20 : 40,
        maxWidth: '1100px',
        margin: '0 auto'
      }}
    >
      <div
        style={{
          position: 'relative',
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          padding: isMobile ? '60px 20px 20px' : '28px',
          marginTop: isMobile ? '76px' : 0,
          marginBottom: '28px'
        }}
      >
        {isMobile ? (
          <>
            <div
              style={{
                position: 'absolute',
                top: '-56px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: '112px',
                  height: '112px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #444',
                  background: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.35)'
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '34px', color: '#888' }}>👤</span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h1
                style={{
                  marginTop: 0,
                  marginBottom: '8px',
                  fontSize: '32px',
                  wordBreak: 'break-word'
                }}
              >
                {displayName}
              </h1>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                  maxWidth: '320px',
                  margin: '0 auto 18px'
                }}
              >
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '14px 12px',
                    textAlign: 'center'
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
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px' }}>
                    Favorited
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{favoritesCount}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadAvatar(e.target.files?.[0])}
                  style={{
                    maxWidth: '100%',
                    fontSize: '14px'
                  }}
                />
              </div>

              {uploading && <p style={{ marginTop: 10 }}>Uploading avatar...</p>}
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: '28px',
              alignItems: 'center'
            }}
          >
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
                  boxShadow: '0 6px 18px rgba(0,0,0,0.35)'
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '48px', color: '#888' }}>👤</span>
                )}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  marginTop: 0,
                  marginBottom: '8px',
                  fontSize: '40px'
                }}
              >
                {displayName}
              </h1>

              <p style={{ margin: '0 0 18px 0', color: '#aaa' }}>
                
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  flexWrap: 'wrap',
                  marginBottom: '18px'
                }}
              >
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    minWidth: '160px',
                    textAlign: 'center'
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
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '6px' }}>
                    Favorited
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 700 }}>{favoritesCount}</div>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadAvatar(e.target.files?.[0])}
              />

              {uploading && <p style={{ marginTop: 10 }}>Uploading avatar...</p>}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ margin: 0 }}>My recipes</h2>
      </div>

      {recipes.length === 0 ? (
        <p style={{ color: '#aaa' }}>You have not created any recipes yet.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: '16px'
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
                  padding: '14px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center'
                  }}
                >
                  {recipe.Image_url ? (
                    <img
                      src={recipe.Image_url}
                      alt={recipe.Name}
                      style={{
                        width: isMobile ? '84px' : '110px',
                        height: isMobile ? '84px' : '110px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        flexShrink: 0
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
                        flexShrink: 0
                      }}
                    />
                  )}

                  <div style={{ minWidth: 0, flex: 1, paddingRight: '56px' }}>
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: '8px',
                        fontSize: isMobile ? '20px' : '24px',
                        fontWeight: 700,
                        lineHeight: 1.15
                      }}
                    >
                      {recipe.Name}
                    </h3>

                    <div
                      style={{
                        color: '#cfcfcf',
                        fontSize: isMobile ? '14px' : '15px',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>{recipe.Category}</div>
                      <div>Prep {recipe.Prep_time ?? '-'} min</div>
                      <div>Cook {recipe.Cook_time ?? '-'} min</div>
                    </div>

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
                        lineHeight: 1
                      }}
                    >
                      <span>★</span>
                      <span>{recipeFavoriteCounts[recipe.id] || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  )
}