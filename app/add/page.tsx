'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const categories = [
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

export default function AddRecipePage() {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Meals')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ingredients, setIngredients] = useState<
    { name: string, ingredient_id: string; amount: string; unit: string }[]
    >([{ name:'', ingredient_id: '', amount: '', unit: '' }])
  const [allIngredients, setAllIngredients] = useState<{ id: number; Name: string }[]>([])
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number |null>(null)

  useEffect(() => {
    loadIngredients()
  }, [])

  async function loadIngredients() {
    const { data, error } = await supabase
      .from('Ingredients')
      .select('id, Name')
      .order('Name')

    if (error) {
      console.log('Ingredient list load error:', error.message)
      return
    }

    setAllIngredients(data || [])
  }

  function updateIngredient(
    index: number,
    field: 'name' | 'ingredient_id' | 'amount' | 'unit',
    value: string
  ) {
    const updatedIngredients = [...ingredients]
    updatedIngredients[index][field] = value
      setIngredients(updatedIngredients)
  }

  function addIngredientRow() {
    setActiveSuggestionIndex(null)
    setIngredients([...ingredients, { name: '', ingredient_id: '', amount: '', unit: '' }])
  }

  function removeIngredientRow(index: number) {
    const updatedIngredients = ingredients.filter((_, i) => i !== index)
    setIngredients(updatedIngredients)
  }

  function getSuggestions(currentValue: string) {
    if (!currentValue.trim()) return []

    return allIngredients
      .filter((ingredient) =>
        (ingredient.Name || '')
          .toLowerCase()
          .includes(currentValue.trim().toLowerCase())
      )
      .slice(0, 5)
  }

  function selectSuggestion(index: number, suggestion: { id: number; Name: string}) {
    const updatedIngredients = [...ingredients]
      updatedIngredients[index].name = suggestion.Name

    updatedIngredients[index].ingredient_id = String(suggestion.id)
      setIngredients(updatedIngredients)
      setActiveSuggestionIndex(null)
  }

  function resizeImage(file: File, maxWidth = 1200, quality = 0.8) {
    return new Promise<Blob>((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (event) => {
        const result = event.target?.result
        if (typeof result !== 'string') {
          reject(new Error('Failed to read image file'))
          return
        }
        img.src = result
      }

      reader.onerror = () => reject(new Error('Failed to read image file'))

      img.onload = () => {
        const canvas = document.createElement('canvas')

        let { width, height } = img

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Could not create image canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'))
              return
            }

            resolve(blob)
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      reader.readAsDataURL(file)
    })
  }

  async function uploadImage(file?: File) {
    if (!file) return

    setUploading(true)
    setMessage('')

    try {
      const resizedBlob = await resizeImage(file)
      const fileName = `${Date.now()}.jpg`

      const { error } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, resizedBlob, {
          contentType: 'image/jpeg'
        })

      if (error) {
        setMessage(`Image upload error: ${error.message}`)
        setUploading(false)
        return
      }

      const { data } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName)

      setImageUrl(data.publicUrl)
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : 'Unknown image processing error'
      setMessage(`Image processing error: ${errMessage}`)
    }

    setUploading(false)
  }

  async function addRecipe() {
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()
    const user = authData.user

    if (authError || !user) {
      setMessage('You must be logged in to add a recipe.')
      return
    }

    const cleanedIngredients = ingredients.filter(
      (ingredient) => ingredient.name.trim() !== '' || ingredient.ingredient_id.trim() !== ''
    )

    if (!name.trim()) {
      setMessage('Recipe name is required.')
      return
    }

    if (!category.trim()) {
      setMessage('Category is required.')
      return
    }

    if (cleanedIngredients.length === 0) {
      setMessage('Add at least one ingredient.')
      return
    }

    if (!instructions.trim() && !notes.trim()) {
      setMessage('Add instructions or notes.')
      return
    }

    const normalizedTags = tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .join(', ')

    setMessage('Saving...')

    const { data: recipeData, error: recipeError } = await supabase
      .from('Recipes')
      .insert([
        {
          Name: name.trim(),
          Category: category,
          Prep_time: prepTime ? Number(prepTime) : null,
          Cook_time: cookTime ? Number(cookTime) : null,
          Instructions: instructions,
          Notes: notes,
          Tags: normalizedTags,
          Image_url: imageUrl,
          user_id: user.id,
          is_public: true,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (recipeError) {
      setMessage(`Recipe error: ${recipeError.message}`)
      return
    }

    const recipeId = recipeData.id

    for (const ingredient of cleanedIngredients) {
      let ingredientId = Number(ingredient.ingredient_id)

      //if no ID -> create ingredient
      if (!ingredientId) {
        const cleanedName = ingredient.name.trim().replace(/\s+/g, '')

        const { data: existingIngredient, error: existingIngredientError } = await supabase
          .from('ingredients')
          .select('id, Name')
          .ilike('Name', cleanedName)
          .maybeSingle()

        if (existingIngredientError) {
          setMessage(`Ingredient lookup error: ${existingIngredientError.message}`) 
          return
        }

        if (existingIngredient) {
          ingredientId = existingIngredient.id
        } else {
          const { data: newIngredient, error: newIngredientError } = await supabase
            .from('Ingredients')
            .insert({ Name: cleanedName })
            .select()
            .single()

          if (newIngredientError) {
            setMessage(`Error creating ingredient: ${newIngredientError.message }`) 
            return
          }
          
          ingredientId = newIngredient.id
        }
      }

      const { error: recipeIngredientError } = await supabase
        .from('Recipe_ingredients')
        .insert({
          Recipe_id: recipeId,
          Ingredient_id: ingredientId,
          Amount: ingredient.amount || null,
          Unit: ingredient.unit || null
        })

      if (recipeIngredientError) { setMessage(`Recipe ingredient error: ${recipeIngredientError.message}`)
        return
      }
    }

    window.location.href = `/recipe/${recipeId}`
  }

  return (
    <div style={{ padding: 40, maxWidth: '900px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'block', marginBottom: '20px' }}>
        ← Back to recipes
      </Link>

      <h1>Add recipe</h1>

      <input
        placeholder="Recipe name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      >
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <input
        placeholder="Prep time (minutes)"
        value={prepTime}
        onChange={(e) => setPrepTime(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        placeholder="Cook time (minutes)"
        value={cookTime}
        onChange={(e) => setCookTime(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        placeholder="Tags (comma separated, e.g. quick, budget, spicy)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <div style={{ marginBottom: 14 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => uploadImage(e.target.files?.[0])}
          style={{ marginBottom: 10 }}
        />

        {uploading && <p>Uploading image...</p>}

        {imageUrl && (
          <div style={{ marginTop: 10 }}>
            <img
              src={imageUrl}
              alt="Recipe preview"
              style={{
                width: '160px',
                borderRadius: '8px'
              }}
            />

            <button
              type="button"
              onClick={() => setImageUrl('')}
              style={{
                marginLeft: 10,
                padding: '6px 10px',
                cursor: 'pointer'
              }}
            >
              Remove image
            </button>
          </div>
        )}
      </div>

      <textarea
        placeholder="Instructions (one step per line)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%', height: 120 }}
      />

      <textarea
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ display: 'block', marginBottom: 20, padding: 10, width: '100%', height: 80 }}
      />

      <h2>Ingredients</h2>

      {ingredients.map((ingredient, index) => {
        const suggestions = getSuggestions(ingredient.name)
        const showSuggestions =
          activeSuggestionIndex === index &&
          ingredient.name.trim() !== '' &&
          suggestions.length > 0 &&
          !suggestions.some(
            (item) => item.Name.toLowerCase() === ingredient.name.trim().toLowerCase()
          )

        return (
          <div key={index} style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr auto',
                gap: '10px',
                alignItems: 'center'
              }}
            >
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Ingredient name"
                  value={ingredient.name}
                  onFocus={() => setActiveSuggestionIndex(index)}
                  onChange={(e) => { 
                    setActiveSuggestionIndex(index)
                    updateIngredient(index, 'name', e.target.value)
                    updateIngredient(index, 'ingredient_id', '')
                  }}
                  onBlur={() => {
                    setTimeout(() => {

                    setActiveSuggestionIndex((current) => (current === index ? null : current))}, 150)
                  }}
                  style={{ padding: 10, width: '100%' }}
                />

                {showSuggestions && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#000',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      marginTop: '4px',
                      zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectSuggestion(index, suggestion)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          border: 'none',
                          background: '#000',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        {suggestion.Name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                placeholder="Amount"
                value={ingredient.amount}
                onFocus={() => setActiveSuggestionIndex(null)}
                onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                style={{ padding: 10, width: '100%' }}
              />

              <input
                placeholder="Unit"
                value={ingredient.unit}
                onFocus={() => setActiveSuggestionIndex(null)}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                style={{ padding: 10, width: '100%' }}
              />

              <button
                type="button"
                onClick={() => removeIngredientRow(index)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                X
              </button>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addIngredientRow}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        + Add ingredient
      </button>

      <div>
        <button
          onClick={addRecipe}
          style={{ padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}
        >
          Save recipe
        </button>
      </div>

      {message && <p style={{ marginTop: 15 }}>{message}</p>}
    </div>
  )
}