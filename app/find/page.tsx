'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function FindPage() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [message, setMessage] = useState('')

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

    const canonicalIngredientIds = new Set()

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
          matchCount: recipeMatches[recipeId]
        }
      })
      .filter(Boolean)

    setResults(recipesWithMatchCount)
  }

  return (
    <div style={{ padding: 40, maxWidth: '900px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'block', marginBottom: '20px' }}>
        ← Back to recipes
      </Link>

      <h1
        style={{
          fontSize: '40px',
          fontWeight: '900',
          textAlign: 'center',
          marginBottom: '30px',
          letterSpacing: '0.5px'
        }}
      >
        Find recipes by ingredient
      </h1>

      <p style={{ marginBottom: '12px' }}>
        Enter one ingredient per line.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={`Onion\nGarlic\nRice`}
        style={{
          width: '100%',
          maxWidth: '500px',
          minHeight: '180px',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid #666',
          marginBottom: '14px',
          lineHeight: 1.8,
          resize: 'vertical',
          background: '#fffef8',
          color: '#111',
          boxSizing: 'border-box'
        }}
      />

      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={findRecipes}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #666',
            cursor: 'pointer'
          }}
        >
          Find recipes
        </button>
      </div>

      {message && <p>{message}</p>}

      {results.map((recipe) => (
        <div
          key={recipe.id}
          style={{
            marginBottom: 20,
            padding: 16,
            border: '1px solid #444',
            borderRadius: '10px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          {recipe.Image_url && (
            <img
              src={recipe.Image_url}
              alt={recipe.Name}
              style={{
                width: '110px',
                height: '110px',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
          )}

          <div>
            <h2 style={{ marginBottom: '6px' }}>
              <Link href={`/recipe/${recipe.id}`}>{recipe.Name}</Link>
            </h2>
            <p>Category: {recipe.Category}</p>
            <p>Prep: {recipe.Prep_time} minutes</p>
            <p>Cook: {recipe.Cook_time} minutes</p>
            <p>Matching ingredients: {recipe.matchCount}</p>
          </div>
        </div>
      ))}
    </div>
  )
}