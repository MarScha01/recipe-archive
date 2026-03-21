'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const categories = [
  'All',
  'Meals',
  'Soups',
  'Sauces',
  'Lunch',
  'Baking',
  'Dessert',
  'Snacks',
  'Sides',
  'Drinks'
]

const sortOptions = [
  'Newest',
  'Alphabetical',
  'Prep time',
  'Cook time',
  'Favorites first'
]

export default function Home() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [windowWidth, setWindowWidth] = useState(1200)
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()

    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function fetchData() {
    setMessage('')

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.log('auth getUser error:', userError)
    }

    const user = userData.user
    setCurrentUserId(user?.id || null)

    const { data: recipeData, error: recipeError } = await supabase
      .from('Recipes')
      .select('*')

    if (recipeError) {
      console.log('recipe load error:', recipeError)
      setRecipes([])
    } else {
      setRecipes(recipeData || [])
    }

    if (user) {
      const { data: favData, error: favError } = await supabase
        .from('recipe_favorites')
        .select('recipe_id')
        .eq('user_id', user.id)

      if (favError) {
        console.log('favorites load error:', favError)
        setMessage(`Favorites load error: ${favError.message}`)
        setFavorites([])
      } else {
        setFavorites(favData?.map((f) => f.recipe_id) || [])
      }
    } else {
      setFavorites([])
    }
  }

  async function toggleFavorite(recipeId: number) {
    setMessage('')

    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData.user

    if (userError) {
      console.log('auth getUser error:', userError)
      setMessage(`Auth error: ${userError.message}`)
      return
    }

    if (!user) {
      setMessage('You must be logged in to favorite recipes.')
      return
    }

    const isFav = favorites.includes(recipeId)

    if (isFav) {
      const { error } = await supabase
        .from('recipe_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId)

      if (error) {
        console.log('favorite delete error:', error)
        setMessage(`Favorite remove error: ${error.message}`)
        return
      }

      setFavorites((prev) => prev.filter((id) => id !== recipeId))
    } else {
      const { error } = await supabase
        .from('recipe_favorites')
        .insert({
          user_id: user.id,
          recipe_id: recipeId
        })

      if (error) {
        console.log('favorite insert error:', error)
        setMessage(`Favorite add error: ${error.message}`)
        return
      }

      setFavorites((prev) => [...prev, recipeId])
    }
  }

  const isTabletOrSmaller = windowWidth < 980
  const isMobile = windowWidth < 760

  const filteredRecipes = recipes
    .filter((recipe) => {
      const searchTerm = search.toLowerCase()

      const matchesSearch =
        recipe.Name?.toLowerCase().includes(searchTerm) ||
        recipe.Tags?.toLowerCase().includes(searchTerm)

      const matchesCategory =
        selectedCategory === 'All' || recipe.Category === selectedCategory

      const matchesFavorite =
        !showOnlyFavorites || favorites.includes(recipe.id)

      const matchesView =
        viewMode === 'all'
          ? recipe.is_public === true
          : currentUserId && recipe.user_id === currentUserId

      return matchesSearch && matchesCategory && matchesFavorite && matchesView
    })
    .sort((a, b) => {
      if (sortBy === 'Alphabetical') {
        return (a.Name || '').localeCompare(b.Name || '')
      }

      if (sortBy === 'Prep time') {
        return (a.Prep_time || 9999) - (b.Prep_time || 9999)
      }

      if (sortBy === 'Cook time') {
        return (a.Cook_time || 9999) - (b.Cook_time || 9999)
      }

      if (sortBy === 'Favorites first') {
        const aFav = favorites.includes(a.id) ? 1 : 0
        const bFav = favorites.includes(b.id) ? 1 : 0

        if (aFav !== bFav) {
          return bFav - aFav
        }

        return (a.Name || '').localeCompare(b.Name || '')
      }

      return (b.id || 0) - (a.id || 0)
    })

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()

    recipes.forEach((recipe) => {
      if (!recipe.Tags) return

      recipe.Tags
        .split(',')
        .map((tag: string) => tag.trim().toLowerCase())
        .filter(Boolean)
        .forEach((tag: string) => tagSet.add(tag))
    })

    return [...tagSet].sort((a, b) => a.localeCompare(b))
  }, [recipes])

  return (
    <div
      style={{
        padding: isMobile ? 20 : 40,
        maxWidth: '1300px',
        margin: '0 auto'
      }}
    >
      <h1
        style={{
          fontSize: isMobile ? '36px' : '48px',
          fontWeight: '900',
          textAlign: 'center',
          marginBottom: '10px'
        }}
      >
        Recipe Archive
      </h1>

      <p
        style={{
          textAlign: 'center',
          color: '#aaa',
          marginBottom: '30px',
          fontSize: isMobile ? '14px' : '16px',
        }}
      >
        Save, organize, and share your recipes
      </p>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}
      >
        <button
          onClick={() => setViewMode('all')}
          style={{
            padding: '10px 16px',
            borderRadius: '20px',
            border: '1px solid #333',
            background: viewMode === 'all' ? '#2c2c2c' : 'transparent',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          All recipes
        </button>

        <button
          onClick={() => setViewMode('mine')}
          style={{
            padding: '10px 16px',
            borderRadius: '20px',
            border: '1px solid #333',
            background: viewMode === 'mine' ? '#2c2c2c' : 'transparent',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          My recipes
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '12px',
            width: '100%',
            maxWidth: isMobile ? '100%' : '420px',
            borderRadius: '10px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: 'white'
          }}
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: 'white',
            minWidth: isMobile ? '100%' : '170px',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              Sort: {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowOnlyFavorites((prev) => !prev)}
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #333',
            background: showOnlyFavorites ? '#2c2c2c' : '#1a1a1a',
            color: 'white',
            cursor: 'pointer',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          {showOnlyFavorites ? 'Showing favorites' : 'Show favorites'}
        </button>
      </div>

      {message && (
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>
          {message}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '30px',
          justifyContent: 'center'
        }}
      >
        {categories.map((category) => {
          const isActive = selectedCategory === category

          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                border: '1px solid #333',
                backgroundColor: isActive ? '#2c2c2c' : 'transparent',
                color: 'white'
              }}
            >
              {category}
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isTabletOrSmaller
            ? '1fr'
            : 'minmax(0, 1fr) 240px',
          gap: '28px',
          alignItems: 'start'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '20px'
          }}
        >
          {filteredRecipes.map((recipe) => {
            const isFav = favorites.includes(recipe.id)

            return (
              <div
                key={recipe.id}
                style={{
                  position: 'relative'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFavorite(recipe.id)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 2,
                    background: '#111',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    color: isFav ? '#ffd54f' : '#888'
                  }}
                >
                  ★
                </button>

                <Link
                  href={`/recipe/${recipe.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <div
                    style={{
                      padding: '18px',
                      border: '1px solid #2a2a2a',
                      borderRadius: '10px',
                      display: 'flex',
                      gap: '18px',
                      alignItems: 'center',
                      background: '#1a1a1a',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      flexDirection: isMobile ? 'column' : 'row',
                      textAlign: isMobile ? 'center' : 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {recipe.Image_url ? (
                      <img
                        src={recipe.Image_url}
                        alt={recipe.Name}
                        style={{
                          width: isMobile ? '100%' : '120px',
                          maxWidth: isMobile ? '260px' : '120px',
                          height: isMobile ? '180px' : '120px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: isMobile ? '100%' : '120px',
                          maxWidth: isMobile ? '260px' : '120px',
                          height: isMobile ? '180px' : '120px',
                          borderRadius: '10px',
                          background: '#222',
                          border: '1px solid #333',
                          flexShrink: 0
                        }}
                      />
                    )}

                    <div style={{ minWidth: 0 }}>
                      <h2
                        style={{
                          marginBottom: '6px',
                          fontSize: '20px',
                          lineHeight: 1.2
                        }}
                      >
                        {recipe.Name}
                      </h2>

                      <p style={{ margin: 0 }}>
                        {recipe.Category} • Prep {recipe.Prep_time} min • Cook {recipe.Cook_time} min
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>

        <aside
          style={{
            position: isTabletOrSmaller ? 'static' : 'sticky',
            top: isTabletOrSmaller ? 'auto' : '84px',
            alignSelf: 'start'
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '18px'
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: '16px',
                fontSize: '20px'
              }}
            >
              Tags
            </h2>

            {allTags.length === 0 ? (
              <p style={{ margin: 0, color: '#aaa' }}>
                No tags yet.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                {allTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '16px',
                      border: '1px solid #333',
                      background: '#111',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: 'white'
                    }}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {filteredRecipes.length === 0 && (
        <p style={{ marginTop: '30px', textAlign: 'center' }}>
          {viewMode === 'mine'
            ? 'You have no recipes yet.'
            : 'No public recipes found.'}
        </p>
      )}
    </div>
  )
}