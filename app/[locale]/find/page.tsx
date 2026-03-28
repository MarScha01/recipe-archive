'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { slugify } from '../../../lib/slugify'
import { useLocale, useTranslations } from 'next-intl'

export default function FindPage() {
  const t = useTranslations()
  const locale = useLocale()

  const [input, setInput] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [windowWidth, setWindowWidth] = useState(1200)

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = windowWidth < 760

  function getTranslatedCategory(category: string) {
    switch (category) {
      case 'Meals':
        return t('categories.meals')
      case 'Soups':
        return t('categories.soups')
      case 'Sauces':
        return t('categories.sauces')
      case 'Lunch':
        return t('categories.lunch')
      case 'Baking':
        return t('categories.baking')
      case 'Dessert':
        return t('categories.dessert')
      case 'Snacks':
        return t('categories.snacks')
      case 'Sides':
        return t('categories.sides')
      case 'Drinks':
        return t('categories.drinks')
      default:
        return category
    }
  }

  async function findRecipes() {
    setMessage('')
    setResults([])

    const wantedIngredients = input
      .split('\n')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)

    if (wantedIngredients.length === 0) {
      setMessage(t('find.enterAtLeastOneIngredient'))
      return
    }

    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('Ingredients')
      .select('id, Name')

    if (ingredientsError) {
      setMessage(`Error loading ingredients: ${ingredientsError.message}`)
      return
    }

    const { data: aliasesData, error: aliasesError } = await supabase
      .from('Ingredient_aliases')
      .select('alias, ingredient_id')

    if (aliasesError) {
      setMessage(`Error loading ingredient aliases: ${aliasesError.message}`)
      return
    }

    const canonicalIngredientIds = new Set<number>()

    wantedIngredients.forEach((wanted) => {
      const directIngredient = ingredientsData.find(
        (ingredient) => ingredient.Name?.toLowerCase() === wanted
      )

      if (directIngredient) {
        canonicalIngredientIds.add(directIngredient.id)
      }

      const matchingAliases = aliasesData.filter(
        (aliasRow) => aliasRow.alias?.toLowerCase() === wanted
      )

      matchingAliases.forEach((aliasRow) => {
        canonicalIngredientIds.add(aliasRow.ingredient_id)
      })
    })

    const ingredientIds = [...canonicalIngredientIds]

    if (ingredientIds.length === 0) {
      setMessage(t('find.noMatchingIngredients'))
      return
    }

    const { data: recipeIngredientData, error: recipeIngredientError } = await supabase
      .from('Recipe_ingredients')
      .select('Recipe_id, Ingredient_id')

    if (recipeIngredientError) {
      setMessage(`Error loading recipe ingredients: ${recipeIngredientError.message}`)
      return
    }

    const recipeMatches: Record<number, number> = {}

    recipeIngredientData.forEach((row) => {
      if (ingredientIds.includes(row.Ingredient_id)) {
        if (!recipeMatches[row.Recipe_id]) {
          recipeMatches[row.Recipe_id] = 0
        }

        recipeMatches[row.Recipe_id]++
      }
    })

    const sortedRecipeIds = Object.entries(recipeMatches)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => Number(id))

    if (sortedRecipeIds.length === 0) {
      setMessage(t('find.noRecipesFound'))
      return
    }

    const { data: recipesData, error: recipesError } = await supabase
      .from('Recipes')
      .select('*')
      .in('id', sortedRecipeIds)

    if (recipesError) {
      setMessage(`Error loading recipes: ${recipesError.message}`)
      return
    }

    const recipesWithMatchCount = sortedRecipeIds
      .map((recipeId) => {
        const recipe = recipesData.find((item) => item.id === recipeId)

        if (!recipe) return null

        return {
          ...recipe,
          matchCount: recipeMatches[recipeId],
        }
      })
      .filter(Boolean)

    setResults(recipesWithMatchCount)
  }

  const popularIngredients = [
    t('find.popularIngredients.onion'),
    t('find.popularIngredients.garlic'),
    t('find.popularIngredients.tomato'),
    t('find.popularIngredients.chicken'),
    t('find.popularIngredients.potato')
  ]

  function addPopularIngredient(ingredient: string) {
    const currentLines = input
      .split('\n')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)

    if (currentLines.includes(ingredient.toLowerCase())) return

    setInput((prev) => (prev.trim() ? `${prev}\n${ingredient}` : ingredient))
  }

  return (
    <div
      style={{
        padding: isMobile ? '20px 14px 40px' : '40px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      <Link
        href={`/${locale}`}
        style={{
          display: 'inline-block',
          marginBottom: '20px',
          textDecoration: 'none',
          color: 'white',
        }}
      >
        ← {t('find.backToRecipes')}
      </Link>

      <div style={{ textAlign: 'center', marginBottom: isMobile ? '24px' : '30px' }}>
        <h1
          style={{
            fontSize: isMobile ? '30px' : '42px',
            fontWeight: '900',
            marginBottom: '10px',
            letterSpacing: '0.5px',
          }}
        >
          {t('find.title')}
        </h1>

        <p
          style={{
            color: '#aaa',
            margin: 0,
            fontSize: isMobile ? '14px' : '18px',
          }}
        >
          {t('find.subtitle')}
        </p>
      </div>

      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '14px',
          padding: isMobile ? '16px' : '22px',
          marginBottom: '40px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '18px',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: '#ddd',
              fontWeight: 600,
              marginRight: '4px',
            }}
          >
            {t('find.popular')}:
          </span>

          {popularIngredients.map((ingredient) => (
            <button
              key={ingredient}
              type="button"
              onClick={() => addPopularIngredient(ingredient)}
              style={{
                padding: '6px 12px',
                borderRadius: '18px',
                border: '1px solid #333',
                background: '#2a2a2a',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {ingredient}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('find.placeholder')}
          style={{
            width: '100%',
            minHeight: isMobile ? '110px' : '130px',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #333',
            marginBottom: '18px',
            lineHeight: 1.6,
            resize: 'vertical',
            background: '#111',
            color: 'white',
            boxSizing: 'border-box',
            fontSize: isMobile ? '15px' : '16px',
          }}
        />

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={findRecipes}
            style={{
              padding: isMobile ? '11px 20px' : '12px 28px',
              borderRadius: '10px',
              border: '1px solid #333',
              background: '#2c2c2c',
              color: 'white',
              cursor: 'pointer',
              fontSize: isMobile ? '15px' : '17px',
              fontWeight: 600,
            }}
          >
            {t('find.findRecipes')}
          </button>
        </div>
      </div>

      {message && (
        <p style={{ textAlign: 'center', marginBottom: '24px' }}>
          {message}
        </p>
      )}

      {results.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 800,
            }}
          >
            {t('find.results')}{' '}
            <span style={{ color: '#aaa', fontWeight: 400 }}>
              ({results.length} {t('find.matches')})
            </span>
          </h2>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '20px',
        }}
      >
        {results.map((recipe) => (
          <div
            key={recipe.id}
            style={{
              position: 'relative',
            }}
          >
            <Link
              href={`/${locale}/recipe/${recipe.id}-${slugify(recipe.Name)}`}
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
                  <h3
                    style={{
                      marginBottom: '6px',
                      fontSize: isMobile ? '17px' : '20px',
                      lineHeight: 1.2,
                      fontWeight: 700,
                    }}
                  >
                    {recipe.Name}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: '#cfcfcf',
                      fontSize: isMobile ? '13px' : '16px',
                      lineHeight: 1.4,
                    }}
                  >
                    {getTranslatedCategory(recipe.Category)} <br />
                    {t('home.prep')} {recipe.Prep_time} {t('home.min')} <br />
                    {t('home.cook')} {recipe.Cook_time} {t('home.min')} <br />
                    {t('find.matchesLabel')} {recipe.matchCount}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}