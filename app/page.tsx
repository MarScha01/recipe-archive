'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { slugify } from '../lib/slugify'
import RecentlyViewed from './components/RecentlyViewed'

/**
 * Available category filter options
 */
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
  'Drinks',
]

/**
 * Available sort options
 */
const sortOptions = [
  'Newest',
  'Alphabetical',
  'Prep time',
  'Cook time',
  'Favorites first',
]

function HomeContent() {
  const searchParams = useSearchParams()

  /**
   * Main page state
   */
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

  /**
   * On first load:
   * - load recipes
   * - load favorites
   * - set responsive width tracking
   */
  useEffect(() => {
    fetchData()

    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /**
   * If the URL contains ?favorites=1,
   * automatically enable favorites-only view
   */
  useEffect(() => {
    const favoritesParam = searchParams.get('favorites')
    setShowOnlyFavorites(favoritesParam === '1')
  }, [searchParams])

  /**
   * Load recipes + logged in user + favorites
   */
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

  /**
   * Add or remove a recipe from favorites
   */
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
          recipe_id: recipeId,
        })

      if (error) {
        console.log('favorite insert error:', error)
        setMessage(`Favorite add error: ${error.message}`)
        return
      }

      setFavorites((prev) => [...prev, recipeId])
    }
  }

  /**
   * Responsive breakpoints
   */
  const isTabletOrSmaller = windowWidth < 980
  const isMobile = windowWidth < 760

  /**
   * Apply:
   * - search
   * - category filter
   * - favorites filter
   * - public/my recipes view
   * - sorting
   */
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

  /**
   * Build sidebar tag list from all recipes
   */
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
        padding: isMobile ? 14 : 40,
        maxWidth: '1300px',
        margin: '0 auto',
      }}
    >
      {/* Page title */}
      <h1
        style={{
          fontSize: isMobile ? '28px' : '48px',
          fontWeight: '900',
          textAlign: 'center',
          marginBottom: '6px',
        }}
      >
        Recipe Archive
      </h1>

      {/* Subtitle */}
      <p
        style={{
          textAlign: 'center',
          color: '#aaa',
          marginBottom: isMobile ? '16px' : '30px',
          fontSize: isMobile ? '13px' : '16px',
        }}
      >
        Save, organize, and share your recipes
      </p>

      {/* View toggle: all recipes / my recipes */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          marginBottom: isMobile ? '14px' : '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setViewMode('all')}
          style={{
            padding: isMobile ? '8px 14px' : '10px 16px',
            borderRadius: '20px',
            fontSize: isMobile ? '15px' : '16px',
            border: '1px solid #333',
            background: viewMode === 'all' ? '#2c2c2c' : 'transparent',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          All recipes
        </button>

        <button
          onClick={() => setViewMode('mine')}
          style={{
            padding: isMobile ? '8px 14px' : '10px 16px',
            borderRadius: '20px',
            fontSize: isMobile ? '15px' : '16px',
            border: '1px solid #333',
            background: viewMode === 'mine' ? '#2c2c2c' : 'transparent',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          My recipes
        </button>
      </div>

      {/* Search / sort / favorites controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr auto' : 'minmax(0, 420px) auto auto',
          gap: '10px',
          alignItems: 'center',
          marginBottom: isMobile ? '16px' : '24px',
        }}
      >
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: isMobile ? '11px 12px' : '12px',
            width: '100%',
            maxWidth: '100%',
            borderRadius: '10px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: 'white',
            fontSize: isMobile ? '15px' : '16px',
          }}
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: isMobile ? '11px 12px' : '12px',
            borderRadius: '10px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: 'white',
            minWidth: isMobile ? '110px' : '170px',
            width: 'auto',
            fontSize: isMobile ? '15px' : '16px',
          }}
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              Sort: {option}
            </option>
          ))}
        </select>

        {!isMobile && (
          <button
            type="button"
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            style={{
              padding: isMobile ? '9px 12px' : '12px 16px',
              borderRadius: '10px',
              border: '1px solid #333',
              background: showOnlyFavorites ? '#2c2c2c' : '#1a1a1a',
              color: 'white',
              cursor: 'pointer',
              fontSize: isMobile ? '14px' : '16px',
              gridColumn: isMobile ? '1 / 2' : 'auto',
              justifySelf: isMobile ? 'start' : 'auto',
              width: isMobile ? 'auto' : 'auto',
              minWidth: isMobile ? '0' : 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {showOnlyFavorites ? 'Showing favorites' : 'Show favorites'}
          </button>
        )}
      </div>

      {/* Status / auth / favorites messages */}
      {message && (
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>
          {message}
        </p>
      )}

      {/* Category filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          gap: '8px',
          marginBottom: isMobile ? '18px' : '30px',
          justifyContent: isMobile ? 'flex-start' : 'center',
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? '4px' : 0,
          WebkitOverflowScrolling: 'touch',
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
                padding: isMobile ? '7px 12px' : '8px 14px',
                borderRadius: '20px',
                fontSize: isMobile ? '14px' : '16px',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
                cursor: 'pointer',
                border: '1px solid #333',
                backgroundColor: isActive ? '#2c2c2c' : 'transparent',
                color: 'white',
              }}
            >
              {category}
            </button>
          )
        })}
      </div>

      {/* Main content area: recipes + tag sidebar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isTabletOrSmaller
            ? '1fr'
            : 'minmax(0, 1fr) 240px',
          gap: '28px',
          alignItems: 'start',
        }}
      >
        {/* Recipe cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '20px',
          }}
        >
          {filteredRecipes.map((recipe) => {
            const isFav = favorites.includes(recipe.id)

            return (
              <div
                key={recipe.id}
                style={{
                  position: 'relative',
                }}
              >
                {/* Favorite button */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(recipe.id)}
                  style={{
                    position: 'absolute',
                    top: isMobile ? '8px' : '10px',
                    right: isMobile ? '8px' : '10px',
                    zIndex: 2,
                    background: '#111',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: isMobile ? '4px 8px' : '6px 10px',
                    cursor: 'pointer',
                    color: isFav ? '#ffd54f' : '#888',
                  }}
                >
                  ★
                </button>

                {/* Recipe link card */}
                <Link
                  href={`/recipe/${recipe.id}-${slugify(recipe.Name)}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      padding: isMobile ? '14px' : '18px',
                      border: '1px solid #2a2a2a',
                      borderRadius: '12px',
                      display: 'flex',
                      gap: isMobile ? '12px' : '18px',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      background: '#1a1a1a',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      flexDirection: 'row',
                      textAlign: 'left',
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
                          width: isMobile ? '92px' : '120px',
                          maxWidth: isMobile ? '92px' : '120px',
                          height: isMobile ? '92px' : '120px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: isMobile ? '92px' : '120px',
                          maxWidth: isMobile ? '92px' : '120px',
                          height: isMobile ? '92px' : '120px',
                          borderRadius: '10px',
                          background: '#222',
                          border: '1px solid #333',
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2
                        style={{
                          marginBottom: '6px',
                          fontSize: isMobile ? '17px' : '20px',
                          lineHeight: 1.2,
                          fontWeight: 700,
                        }}
                      >
                        {recipe.Name}
                      </h2>

                      <p
                        style={{
                          margin: 0,
                          color: '#cfcfcf',
                          fontSize: isMobile ? '13px' : '16px',
                          lineHeight: 1.4,
                        }}
                      >
                        {recipe.Category} <br />
                        Prep {recipe.Prep_time} min <br />
                        Cook {recipe.Cook_time} min
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>

        {/* Tag sidebar */}
        <aside
          style={{
            position: isTabletOrSmaller ? 'static' : 'sticky',
            top: isTabletOrSmaller ? 'auto' : '84px',
            alignSelf: 'start',
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '18px',
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: '16px',
                fontSize: '20px',
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
                  gap: '8px',
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
                      color: 'white',
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

      {/* Recently viewed section */}
      <div style={{ marginTop: '50px' }}>
        <RecentlyViewed />
      </div>

      {/* Empty state */}
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

/**
 * Wrapper with Suspense for useSearchParams
 */
export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'white' }}>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}