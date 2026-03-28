'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useLocale, useTranslations } from 'next-intl'

export default function EditRecipePage() {
  const params = useParams()
  const id = params.id
  const locale = useLocale()
  const t = useTranslations()

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
  const [ingredients, setIngredients] = useState<{
    ingredient_id: string
    amount: string
    unit: string
  }[]>([])
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)

  useEffect(() => {
    if (id) {
      loadRecipe()
    }
  }, [id])

  function updateIngredient(
    index: number,
    field: 'ingredient_id' | 'amount' | 'unit',
    value: string
  ) {
    const updatedIngredients = [...ingredients]
    updatedIngredients[index][field] = value
    setIngredients(updatedIngredients)
  }

  function addIngredientRow() {
    setIngredients([...ingredients, { ingredient_id: '', amount: '', unit: '' }])
  }

  function removeIngredientRow(index: number) {
    const updatedIngredients = ingredients.filter((_, i) => i !== index)
    setIngredients(updatedIngredients)
  }

  function resizeImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
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

  async function uploadImage(file: File | null) {
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

  async function loadRecipe() {
    setMessage(t('editRecipe.loadingRecipe'))
    setCheckingAccess(true)

    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData.user

    if (!currentUser) {
      setMessage(t('editRecipe.mustBeLoggedIn'))
      setAuthorized(false)
      setCheckingAccess(false)
      return
    }

    const { data: recipeData, error: recipeError } = await supabase
      .from('Recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (recipeError) {
      setMessage(`Recipe load error: ${recipeError.message}`)
      setAuthorized(false)
      setCheckingAccess(false)
      return
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profileError) {
      setMessage(`Profile load error: ${profileError.message}`)
      setAuthorized(false)
      setCheckingAccess(false)
      return
    }

    const isOwner = recipeData.user_id === currentUser.id
    const isAdmin = currentProfile?.is_admin === true

    if (!isOwner && !isAdmin) {
      setMessage(t('editRecipe.notAllowedEdit'))
      setAuthorized(false)
      setCheckingAccess(false)
      return
    }

    setAuthorized(true)

    setName(recipeData.Name || '')
    setCategory(recipeData.Category || 'Meals')
    setPrepTime(recipeData.Prep_time ? String(recipeData.Prep_time) : '')
    setCookTime(recipeData.Cook_time ? String(recipeData.Cook_time) : '')
    setInstructions(recipeData.Instructions || '')
    setNotes(recipeData.Notes || '')
    setTags(recipeData.Tags || '')
    setImageUrl(recipeData.Image_url || '')

    const { data: recipeIngredientsData, error: recipeIngredientsError } = await supabase
      .from('Recipe_ingredients')
      .select('*')
      .eq('Recipe_id', id)

    if (recipeIngredientsError) {
      setMessage(`Recipe ingredients load error: ${recipeIngredientsError.message}`)
      setCheckingAccess(false)
      return
    }

    if (!recipeIngredientsData || recipeIngredientsData.length === 0) {
      setIngredients([{ ingredient_id: '', amount: '', unit: '' }])
      setMessage('')
      setCheckingAccess(false)
      return
    }

    const ingredientIds = recipeIngredientsData.map((item) => item.Ingredient_id)

    const { data: ingredientNames, error: ingredientNamesError } = await supabase
      .from('Ingredients')
      .select('id, Name')
      .in('id', ingredientIds)

    if (ingredientNamesError) {
      setMessage(`Ingredient names load error: ${ingredientNamesError.message}`)
      setCheckingAccess(false)
      return
    }

    const mergedIngredients = recipeIngredientsData.map((item) => {
      const matchingIngredient = ingredientNames.find(
        (ingredient) => String(ingredient.id) === String(item.Ingredient_id)
      )

      return {
        ingredient_id: matchingIngredient ? matchingIngredient.Name : '',
        amount: item.Amount || '',
        unit: item.Unit || ''
      }
    })

    setIngredients(
      mergedIngredients.length > 0
        ? mergedIngredients
        : [{ ingredient_id: '', amount: '', unit: '' }]
    )

    setMessage('')
    setCheckingAccess(false)
  }

  async function saveRecipe() {
    setMessage('')

    if (!authorized) {
      setMessage(t('editRecipe.notAllowedEdit'))
      return
    }

    const cleanedIngredients = ingredients.filter(
      (ingredient) => ingredient.ingredient_id.trim() !== ''
    )

    if (!name.trim()) {
      setMessage(t('add.recipeNameRequired'))
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

    setMessage(t('editRecipe.saving'))

    const { error: recipeUpdateError } = await supabase
      .from('Recipes')
      .update({
        Name: name.trim(),
        Category: category,
        Prep_time: prepTime ? Number(prepTime) : null,
        Cook_time: cookTime ? Number(cookTime) : null,
        Instructions: instructions,
        Notes: notes,
        Tags: normalizedTags,
        Image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (recipeUpdateError) {
      setMessage(`Recipe update error: ${recipeUpdateError.message}`)
      return
    }

    const { error: deleteLinksError } = await supabase
      .from('Recipe_ingredients')
      .delete()
      .eq('Recipe_id', id)

    if (deleteLinksError) {
      setMessage(`Old ingredient links delete error: ${deleteLinksError.message}`)
      return
    }

    for (const ingredient of cleanedIngredients) {
      const ingredientName = ingredient.ingredient_id.trim()

      const { data: existingIngredient, error: existingIngredientError } = await supabase
        .from('Ingredients')
        .select('id, Name')
        .ilike('Name', ingredientName)
        .limit(1)
        .maybeSingle()

      if (existingIngredientError) {
        setMessage(`Ingredient lookup error: ${existingIngredientError.message}`)
        return
      }

      let ingredientId

      if (existingIngredient) {
        ingredientId = existingIngredient.id
      } else {
        const formattedIngredientName =
          ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1)

        const { data: newIngredient, error: newIngredientError } = await supabase
          .from('Ingredients')
          .insert([{ Name: formattedIngredientName }])
          .select()
          .single()

        if (newIngredientError) {
          setMessage(`Ingredient insert error: ${newIngredientError.message}`)
          return
        }

        ingredientId = newIngredient.id
      }

      const { error: linkError } = await supabase
        .from('Recipe_ingredients')
        .insert([
          {
            Recipe_id: Number(id),
            Ingredient_id: ingredientId,
            Amount: ingredient.amount || null,
            Unit: ingredient.unit || null
          }
        ])

      if (linkError) {
        setMessage(`Recipe ingredient link error: ${linkError.message}`)
        return
      }
    }

    window.location.href = `/${locale}/recipe/${id}`
  }

  async function deleteRecipe() {
    if (!authorized) {
      setMessage(t('editRecipe.notAllowedDelete'))
      return
    }

    const confirmed = window.confirm(t('editRecipe.confirmDelete'))
    if (!confirmed) return

    setMessage(t('editRecipe.deleting'))

    const { error } = await supabase
      .from('Recipes')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(`Delete error: ${error.message}`)
      return
    }

    window.location.href = `/${locale}`
  }

  if (checkingAccess) {
    return <div style={{ padding: 40 }}>{t('editRecipe.loadingRecipe')}</div>
  }

  if (!authorized) {
    return (
      <div style={{ padding: 40, maxWidth: '900px', margin: '0 auto' }}>
        <Link href={`/${locale}`} style={{ display: 'block', marginBottom: '20px' }}>
          ← {t('editRecipe.backToRecipes')}
        </Link>
        <p>{message || t('editRecipe.notAllowedView')}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, maxWidth: '900px', margin: '0 auto' }}>
      <Link href={`/${locale}/recipe/${id}`} style={{ display: 'block', marginBottom: '20px' }}>
        ← {t('editRecipe.backToRecipe')}
      </Link>

      <h1>{t('editRecipe.title')}</h1>

      <input
        placeholder={t('add.recipeName')}
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
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <input
        placeholder={t('add.prepTime')}
        value={prepTime}
        onChange={(e) => setPrepTime(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        placeholder={t('add.cookTime')}
        value={cookTime}
        onChange={(e) => setCookTime(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <input
        placeholder={t('add.tags')}
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
      />

      <div style={{ marginBottom: 14 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => uploadImage(e.target.files?.[0] ?? null)}
          style={{ marginBottom: 10 }}
        />

        {uploading && <p>{t('add.uploadingImage')}</p>}

        {imageUrl && (
          <div style={{ marginTop: 10 }}>
            <img
              src={imageUrl}
              alt={t('add.recipePreview')}
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
          marginBottom: 10,
          padding: 10,
          width: '100%',
          height: 120
        }}
      />

      <textarea
        placeholder={t('add.notes')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{
          display: 'block',
          marginBottom: 20,
          padding: 10,
          width: '100%',
          height: 80
        }}
      />

      <h2>{t('add.ingredients')}</h2>

      {ingredients.map((ingredient, index) => (
        <div
          key={index}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr auto',
            gap: '10px',
            marginBottom: '10px',
            alignItems: 'center'
          }}
        >
          <input
            placeholder={t('add.ingredientName')}
            value={ingredient.ingredient_id}
            onChange={(e) => updateIngredient(index, 'ingredient_id', e.target.value)}
            style={{ padding: 10, width: '100%' }}
          />

          <input
            placeholder={t('add.amount')}
            value={ingredient.amount}
            onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
            style={{ padding: 10, width: '100%' }}
          />

          <input
            placeholder={t('add.unit')}
            value={ingredient.unit}
            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
            style={{ padding: 10, width: '100%' }}
          />

          <button
            type="button"
            onClick={() => removeIngredientRow(index)}
            style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}
          >
            {t('add.removeIngredient')}
          </button>
        </div>
      ))}

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
        {t('add.addIngredient')}
      </button>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={saveRecipe}
          style={{ padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}
        >
          {t('editRecipe.saveChanges')}
        </button>

        <button
          onClick={deleteRecipe}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            cursor: 'pointer',
            backgroundColor: '#7a1f1f',
            color: 'white',
            border: 'none'
          }}
        >
          {t('editRecipe.deleteRecipe')}
        </button>
      </div>

      {message && <p style={{ marginTop: 15 }}>{message}</p>}
    </div>
  )
}