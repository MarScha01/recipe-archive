'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { slugify } from '../../../lib/slugify'
import { useLocale, useTranslations } from 'next-intl'

export default function AddRecipePage() {
  const t = useTranslations()
  const locale = useLocale()

  const categories = [
    { value: 'Meals', label: t('categories.meals') },
    { value: 'Soups', label: t('categories.soups') },
    { value: 'Sauces', label: t('categories.sauces') },
    { value: 'Lunch', label: t('categories.lunch') },
    { value: 'Baking', label: t('categories.baking') },
    { value: 'Dessert', label: t('categories.dessert') },
    { value: 'Snacks', label: t('categories.snacks') },
    { value: 'Sides', label: t('categories.sides') },
    { value: 'Drinks', label: t('categories.drinks') }
  ]

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Meals')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [ingredients, setIngredients] = useState<
    { name: string; ingredient_id: string; amount: string; unit: string }[]
  >([{ name: '', ingredient_id: '', amount: '', unit: '' }])
  const [allIngredients, setAllIngredients] = useState<{ id: number; Name: string }[]>([])
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null)
  const [windowWidth, setWindowWidth] = useState(1200)

  const isMobile = windowWidth < 760

  useEffect(() => {
    loadIngredients()

    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
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

  function selectSuggestion(index: number, suggestion: { id: number; Name: string }) {
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
      setMessage(t('add.mustBeLoggedIn'))
      return
    }

    const cleanedIngredients = ingredients.filter(
      (ingredient) => ingredient.name.trim() !== '' || ingredient.ingredient_id.trim() !== ''
    )

    if (!name.trim()) {
      setMessage(t('add.recipeNameRequired'))
      return
    }

    if (!category.trim()) {
      setMessage(t('add.categoryRequired'))
      return
    }

    if (cleanedIngredients.length === 0) {
      setMessage(t('add.atLeastOneIngredient'))
      return
    }

    if (!instructions.trim() && !notes.trim()) {
      setMessage(t('add.instructionsOrNotes'))
      return
    }

    const normalizedTags = tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .join(', ')

    setMessage(t('add.saving'))

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
          is_public: isPublic,
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

      if (!ingredientId) {
        const cleanedName = ingredient.name.trim()

        const { data: existingIngredients, error: existingIngredientError } = await supabase
          .from('Ingredients')
          .select('id, Name')
          .ilike('Name', cleanedName)

        if (existingIngredientError) {
          setMessage(`Ingredient lookup error: ${existingIngredientError.message}`)
          return
        }

        if (existingIngredients && existingIngredients.length > 0) {
          ingredientId = existingIngredients[0].id
        } else {
          const { data: newIngredient, error: newIngredientError } = await supabase
            .from('Ingredients')
            .insert({ Name: cleanedName })
            .select()
            .single()

          if (newIngredientError) {
            setMessage(`Error creating ingredient: ${newIngredientError.message}`)
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

      if (recipeIngredientError) {
        setMessage(`Recipe ingredient error: ${recipeIngredientError.message}`)
        return
      }
    }

    window.location.href = `/${locale}/recipe/${recipeId}-${slugify(name.trim())}`
  }

  return (
    <div
      style={{
        padding: isMobile ? '24px 14px 50px' : '40px 24px 60px',
        maxWidth: '980px',
        margin: '0 auto'
      }}
    >
      <Link
        href={`/${locale}`}
        style={{
          display: 'inline-block',
          marginBottom: isMobile ? '18px' : '22px',
          color: 'white',
          textDecoration: 'none',
          fontSize: isMobile ? '16px' : '18px'
        }}
      >
        ← {t('add.backToRecipes')}
      </Link>

      <div
        style={{
          borderTop: '1px solid #222',
          paddingTop: isMobile ? '18px' : '24px'
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? '40px' : '52px',
            lineHeight: 1.05,
            margin: '0 0 22px',
            fontWeight: 800
          }}
        >
          {t('add.title')}
        </h1>

        <div style={{ display: 'grid', gap: '14px', marginBottom: '18px' }}>
          <input
            placeholder={t('add.recipeName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              display: 'block',
              padding: isMobile ? '13px 14px' : '14px 16px',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid #2f2f2f',
              background: '#111',
              color: 'white',
              fontSize: isMobile ? '15px' : '16px'
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: '14px',
            marginBottom: '20px',
            borderBottom: '1px solid #222',
            paddingBottom: '20px'
          }}
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              display: 'block',
              padding: isMobile ? '13px 14px' : '14px 16px',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid #2f2f2f',
              background: '#111',
              color: 'white',
              fontSize: isMobile ? '15px' : '16px'
            }}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              gap: '14px'
            }}
          >
            <input
              placeholder={t('add.prepTime')}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              style={{
                display: 'block',
                padding: isMobile ? '13px 14px' : '14px 16px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #2f2f2f',
                background: '#111',
                color: 'white',
                fontSize: isMobile ? '15px' : '16px'
              }}
            />

            <input
              placeholder={t('add.cookTime')}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              style={{
                display: 'block',
                padding: isMobile ? '13px 14px' : '14px 16px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #2f2f2f',
                background: '#111',
                color: 'white',
                fontSize: isMobile ? '15px' : '16px'
              }}
            />
          </div>

          <input
            placeholder={t('add.tags')}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            style={{
              display: 'block',
              padding: isMobile ? '13px 14px' : '14px 16px',
              width: '100%',
              borderRadius: '8px',
              border: '1px solid #2f2f2f',
              background: '#111',
              color: 'white',
              fontSize: isMobile ? '15px' : '16px'
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: '12px',
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row'
            }}
          >
            <span style={{ fontSize: '15px', color: '#d3d3d3' }}>
              Visibility
            </span>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: isPublic ? '1px solid #3f7f5a' : '1px solid #333',
                  background: isPublic ? '#234131' : '#111',
                  color: 'white',
                  cursor: 'pointer',
                  flex: isMobile ? 1 : 'unset'
                }}
              >
                Public
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: !isPublic ? '1px solid #666' : '1px solid #333',
                  background: !isPublic ? '#222' : '#111',
                  color: 'white',
                  cursor: 'pointer',
                  flex: isMobile ? 1 : 'unset'
                }}
              >
                Private
              </button>
            </div>
          </div>

          <div style={{ marginTop: '4px' }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadImage(e.target.files?.[0])}
              style={{ marginBottom: '10px', maxWidth: '100%' }}
            />

            {uploading && <p style={{ margin: '8px 0 0' }}>{t('add.uploadingImage')}</p>}

            {imageUrl && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  flexDirection: isMobile ? 'column' : 'row'
                }}
              >
                <img
                  src={imageUrl}
                  alt={t('add.recipePreview')}
                  style={{
                    width: isMobile ? '100%' : '170px',
                    maxWidth: isMobile ? '100%' : '170px',
                    height: isMobile ? '200px' : '120px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    border: '1px solid #333'
                  }}
                />

                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    background: '#111',
                    color: 'white',
                    cursor: 'pointer',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  {t('add.removeImage')}
                </button>
              </div>
            )}
          </div>

          <textarea
            placeholder={t('add.instructions')}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            style={{
              display: 'block',
              padding: isMobile ? '13px 14px' : '14px 16px',
              width: '100%',
              minHeight: isMobile ? '130px' : '140px',
              borderRadius: '8px',
              border: '1px solid #2f2f2f',
              background: '#111',
              color: 'white',
              fontSize: isMobile ? '15px' : '16px',
              resize: 'vertical'
            }}
          />

          <textarea
            placeholder={t('add.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              display: 'block',
              padding: isMobile ? '13px 14px' : '14px 16px',
              width: '100%',
              minHeight: isMobile ? '90px' : '90px',
              borderRadius: '8px',
              border: '1px solid #2f2f2f',
              background: '#111',
              color: 'white',
              fontSize: isMobile ? '15px' : '16px',
              resize: 'vertical'
            }}
          />
        </div>

        <h2
          style={{
            fontSize: isMobile ? '28px' : '34px',
            margin: '0 0 18px',
            fontWeight: 700
          }}
        >
          {t('add.ingredients')}
        </h2>

        {!isMobile && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 120px minmax(0, 1fr) 44px',
              gap: '12px',
              color: '#a8a8a8',
              fontSize: '14px',
              padding: '0 6px 12px',
              borderBottom: '1px solid #222',
              marginBottom: '16px'
            }}
          >
            <div>{t('add.amount')}</div>
            <div>{t('add.unit')}</div>
            <div>{t('add.ingredientName')}</div>
            <div style={{ textAlign: 'center' }}>×</div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '14px' }}>
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
              <div key={index}>
                {isMobile ? (
                  <div
                    style={{
                      display: 'grid',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '90px 90px 44px',
                        gap: '8px',
                        alignItems: 'start'
                      }}
                    >
                      <input
                        placeholder={t('add.amount')}
                        value={ingredient.amount}
                        onFocus={() => setActiveSuggestionIndex(null)}
                        onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                        style={{
                          padding: '12px 12px',
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid #2f2f2f',
                          background: '#111',
                          color: 'white',
                          fontSize: '15px'
                        }}
                      />

                      <input
                        placeholder={t('add.unit')}
                        value={ingredient.unit}
                        onFocus={() => setActiveSuggestionIndex(null)}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        style={{
                          padding: '12px 12px',
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid #2f2f2f',
                          background: '#111',
                          color: 'white',
                          fontSize: '15px'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => removeIngredientRow(index)}
                        style={{
                          height: '44px',
                          borderRadius: '8px',
                          border: '1px solid #333',
                          background: '#111',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '22px',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <input
                        placeholder={t('add.ingredientName')}
                        value={ingredient.name}
                        onFocus={() => setActiveSuggestionIndex(index)}
                        onChange={(e) => {
                          setActiveSuggestionIndex(index)
                          updateIngredient(index, 'name', e.target.value)
                          updateIngredient(index, 'ingredient_id', '')
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setActiveSuggestionIndex((current) => (current === index ? null : current))
                          }, 150)
                        }}
                        style={{
                          padding: '12px 14px',
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid #2f2f2f',
                          background: '#111',
                          color: 'white',
                          fontSize: '15px'
                        }}
                      />

                      {showSuggestions && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '10px',
                            marginTop: '6px',
                            zIndex: 10,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                            overflow: 'hidden'
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
                                padding: '11px 12px',
                                border: 'none',
                                borderBottom: '1px solid #222',
                                background: '#111',
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
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 120px minmax(0, 1fr) 44px',
                      gap: '12px',
                      alignItems: 'start'
                    }}
                  >
                    <input
                      placeholder={t('add.amount')}
                      value={ingredient.amount}
                      onFocus={() => setActiveSuggestionIndex(null)}
                      onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                      style={{
                        padding: '12px 14px',
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #2f2f2f',
                        background: '#111',
                        color: 'white',
                        fontSize: '15px'
                      }}
                    />

                    <input
                      placeholder={t('add.unit')}
                      value={ingredient.unit}
                      onFocus={() => setActiveSuggestionIndex(null)}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      style={{
                        padding: '12px 14px',
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #2f2f2f',
                        background: '#111',
                        color: 'white',
                        fontSize: '15px'
                      }}
                    />

                    <div style={{ position: 'relative' }}>
                      <input
                        placeholder={t('add.ingredientName')}
                        value={ingredient.name}
                        onFocus={() => setActiveSuggestionIndex(index)}
                        onChange={(e) => {
                          setActiveSuggestionIndex(index)
                          updateIngredient(index, 'name', e.target.value)
                          updateIngredient(index, 'ingredient_id', '')
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setActiveSuggestionIndex((current) => (current === index ? null : current))
                          }, 150)
                        }}
                        style={{
                          padding: '12px 14px',
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid #2f2f2f',
                          background: '#111',
                          color: 'white',
                          fontSize: '15px'
                        }}
                      />

                      {showSuggestions && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '10px',
                            marginTop: '6px',
                            zIndex: 10,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                            overflow: 'hidden'
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
                                padding: '11px 12px',
                                border: 'none',
                                borderBottom: '1px solid #222',
                                background: '#111',
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

                    <button
                      type="button"
                      onClick={() => removeIngredientRow(index)}
                      style={{
                        height: '46px',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        background: '#111',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '22px',
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div
          style={{
            marginTop: '20px',
            borderTop: '1px solid #222',
            paddingTop: '20px'
          }}
        >
          <button
            type="button"
            onClick={addIngredientRow}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#1a1f2a',
              color: 'white',
              cursor: 'pointer',
              marginBottom: '22px',
              fontSize: '15px',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            {t('add.addIngredient')}
          </button>

          <div>
            <button
              onClick={addRecipe}
              style={{
                padding: '14px 24px',
                borderRadius: '8px',
                border: '1px solid #3f7f5a',
                background: '#2d6a4f',
                color: 'white',
                cursor: 'pointer',
                fontSize: '17px',
                fontWeight: 700,
                width: isMobile ? '100%' : 'auto'
              }}
            >
              {t('add.saveRecipe')}
            </button>
          </div>

          {message && (
            <p style={{ marginTop: '16px', color: '#ddd' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}