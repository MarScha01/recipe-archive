'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { slugify } from '../../lib/slugify'

export default function FindPage() {
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

  async function findRecipes() {
    setMessage('')
    setResults([])

    const wantedIngredients = input
      .split('\n')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)

    if (wantedIngredients.length === 0) {
      setMessage('Enter at least one ingredient.')
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
      setMessage('No matching ingredients found in database.')
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
      setMessage('No recipes found with those ingredients.')
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

  const popularIngredients = ['onion', 'garlic', 'tomato', 'chicken', 'potato']

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
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: 'inline-block',
          marginBottom: '20px',
          textDecoration: 'none',
          color: 'white',
        }}
      >
        ← Back to recipes
      </Link>

      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: isMobile ? '24px' : '30px' }}>
        <h1
          style={{
            fontSize: isMobile ? '30px' : '42px',
            fontWeight: '900',
            marginBottom: '10px',
            letterSpacing: '0.5px',
          }}
        >
          Find recipes by ingredient
        </h1>

        <p
          style={{
            color: '#aaa',
            margin: 0,
            fontSize: isMobile ? '14px' : '18px',
          }}
        >
          Enter the ingredients you have and we’ll show recipes you can make.
        </p>
      </div>

      {/* Search card */}
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
        {/* Popular ingredients */}
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
            Popular:
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

        {/* Textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an ingredient..."
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

        {/* Search button */}
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
            Find recipes
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <p style={{ textAlign: 'center', marginBottom: '24px' }}>
          {message}
        </p>
      )}

      {/* Results title */}
      {results.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 800,
            }}
          >
            Results <span style={{ color: '#aaa', fontWeight: 400 }}>({results.length} matches)</span>
          </h2>
        </div>
      )}

      {/* Results grid */}
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
                    {recipe.Category} <br />
                    Prep {recipe.Prep_time} min <br />
                    Cook {recipe.Cook_time} min <br />
                    Matches {recipe.matchCount}
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