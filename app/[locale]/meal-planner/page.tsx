'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useLocale, useTranslations } from 'next-intl'

type Recipe = {
  id: number
  Name: string
  Category: string | null
  Prep_time: number | null
  Cook_time: number | null
  Image_url: string | null
}

type MealPlan = {
  id: number
  week_start: string
}

type DayName =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type MealPlanEntry = {
  id: number
  meal_plan_id: number
  day_name: DayName
  entry_type: 'recipe' | 'manual'
  recipe_id: number | null
  text: string | null
  note: string | null
  position: number
  recipe?: Recipe | null
}

type ShoppingListItem = {
  id: number
  item_name: string | null
  amount: string | null
  unit: string | null
  source_type: 'manual' | 'recipe'
  recipe_id: number | null
  is_checked: boolean
  position: number
}

const dayOrder: DayName[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function getMondayOfCurrentWeek() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDateForDb(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatPrettyDate(date: Date, locale: string) {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    nl: 'nl-NL',
    de: 'de-DE',
    lt: 'lt-LT'
  }

  return date.toLocaleDateString(localeMap[locale] || 'en-US', {
    month: 'long',
    day: 'numeric',
  })
}

function getDateForDay(weekStart: string, index: number, locale: string) {
  const date = new Date(`${weekStart}T00:00:00`)
  date.setDate(date.getDate() + index)
  return formatPrettyDate(date, locale)
}

function formatShoppingItemLabel(item: ShoppingListItem) {
  const parts = [item.amount, item.unit, item.item_name].filter(
    (value) => value && String(value).trim() !== ''
  )
  return parts.join(' ')
}

export default function MealPlannerPage() {
  const t = useTranslations()
  const locale = useLocale()

  const dayLabels: Record<DayName, string> = {
    monday: t('mealPlanner.days.monday'),
    tuesday: t('mealPlanner.days.tuesday'),
    wednesday: t('mealPlanner.days.wednesday'),
    thursday: t('mealPlanner.days.thursday'),
    friday: t('mealPlanner.days.friday'),
    saturday: t('mealPlanner.days.saturday'),
    sunday: t('mealPlanner.days.sunday'),
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([])
  const [manualItem, setManualItem] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [windowWidth, setWindowWidth] = useState(1200)
  const [openRecipePickerDay, setOpenRecipePickerDay] = useState<DayName | null>(null)
  const [manualEntryDay, setManualEntryDay] = useState<DayName | null>(null)
  const [manualEntryText, setManualEntryText] = useState('')
  const [noteEntryDay, setNoteEntryDay] = useState<DayName | null>(null)
  const [noteEntryText, setNoteEntryText] = useState('')
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<number | null>(null)
  const [recipeSearchText, setRecipeSearchText] = useState('')

  const weekStart = useMemo(() => formatDateForDb(getMondayOfCurrentWeek()), [])

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadPage()
  }, [])

  function getTranslatedCategory(category: string | null) {
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
        return category || t('mealPlanner.uncategorized')
    }
  }

  async function loadPage() {
    setLoading(true)
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setMessage(t('mealPlanner.mustBeLoggedIn'))
      setLoading(false)
      return
    }

    const userId = authData.user.id
    setCurrentUserId(userId)

    const loadedPlan = await getOrCreateMealPlan(userId, weekStart)

    if (!loadedPlan) {
      setMessage(t('mealPlanner.couldNotLoad'))
      setLoading(false)
      return
    }

    setMealPlan(loadedPlan)

    await loadRecipes(userId)
    await refreshPlannerData(loadedPlan.id)

    setLoading(false)
  }

  async function refreshPlannerData(mealPlanId: number) {
    const loadedEntries = await loadEntries(mealPlanId)
    await syncRecipeShoppingItems(mealPlanId, loadedEntries)
    await loadStoredShoppingList(mealPlanId)
  }

  async function getOrCreateMealPlan(userId: string, weekStartDate: string) {
    const { data: existingPlan, error: selectError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStartDate)
      .maybeSingle()

    if (selectError) {
      console.log('meal plan load error:', selectError)
      return null
    }

    if (existingPlan) {
      return existingPlan as MealPlan
    }

    const { data: createdPlan, error: insertError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        week_start: weekStartDate,
      })
      .select('*')
      .single()

    if (insertError) {
      console.log('meal plan create error:', insertError)
      return null
    }

    return createdPlan as MealPlan
  }

  async function loadEntries(mealPlanId: number): Promise<MealPlanEntry[]> {
    const { data, error } = await supabase
      .from('meal_plan_entries')
      .select('*')
      .eq('meal_plan_id', mealPlanId)
      .order('day_name', { ascending: true })
      .order('position', { ascending: true })

    if (error) {
      console.log('meal plan entries load error:', error)
      setMessage(`Entries load error: ${error.message}`)
      setEntries([])
      return []
    }

    const rawEntries = (data || []) as MealPlanEntry[]

    const recipeIds = rawEntries
      .filter((entry) => entry.recipe_id)
      .map((entry) => entry.recipe_id) as number[]

    let recipeMap = new Map<number, Recipe>()

    if (recipeIds.length > 0) {
      const { data: recipeRows, error: recipeError } = await supabase
        .from('Recipes')
        .select('id, Name, Category, Prep_time, Cook_time, Image_url')
        .in('id', recipeIds)

      if (recipeError) {
        console.log('linked recipes load error:', recipeError)
      } else {
        recipeMap = new Map(
          (recipeRows || []).map((recipe: Recipe) => [recipe.id, recipe])
        )
      }
    }

    const merged = rawEntries.map((entry) => ({
      ...entry,
      recipe: entry.recipe_id ? recipeMap.get(entry.recipe_id) || null : null,
    }))

    setEntries(merged)
    return merged
  }

  async function loadRecipes(userId: string) {
    const { data, error } = await supabase
      .from('Recipes')
      .select('id, Name, Category, Prep_time, Cook_time, Image_url, is_public, user_id')
      .or(`is_public.eq.true,user_id.eq.${userId}`)
      .order('Name', { ascending: true })

    if (error) {
      console.log('recipes load error:', error)
      return
    }

    setRecipes((data || []) as Recipe[])
  }

  async function loadStoredShoppingList(mealPlanId: number) {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('meal_plan_id', mealPlanId)
      .order('source_type', { ascending: false })
      .order('position', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      console.log('shopping list load error:', error)
      setMessage(`Shopping list load error: ${error.message}`)
      setShoppingList([])
      return
    }

    setShoppingList((data || []) as ShoppingListItem[])
  }

  function getEntriesForDay(dayName: DayName) {
    return entries.filter((entry) => entry.day_name === dayName)
  }

  async function saveManualEntry() {
    if (!mealPlan || !manualEntryDay) return

    const trimmed = manualEntryText.trim()
    if (!trimmed) return

    const position = getEntriesForDay(manualEntryDay).length

    const { error } = await supabase
      .from('meal_plan_entries')
      .insert({
        meal_plan_id: mealPlan.id,
        day_name: manualEntryDay,
        entry_type: 'manual',
        text: trimmed,
        position,
      })

    if (error) {
      setMessage(`Add entry error: ${error.message}`)
      return
    }

    setManualEntryText('')
    setManualEntryDay(null)

    await refreshPlannerData(mealPlan.id)
  }

  async function saveNoteEntry() {
    if (!mealPlan || !noteEntryDay) return

    const trimmed = noteEntryText.trim()
    if (!trimmed) return

    const position = getEntriesForDay(noteEntryDay).length

    const { error } = await supabase
      .from('meal_plan_entries')
      .insert({
        meal_plan_id: mealPlan.id,
        day_name: noteEntryDay,
        entry_type: 'manual',
        text: t('mealPlanner.noteLabel'),
        note: trimmed,
        position,
      })

    if (error) {
      setMessage(`Add note error: ${error.message}`)
      return
    }

    setNoteEntryText('')
    setNoteEntryDay(null)

    await refreshPlannerData(mealPlan.id)
  }

  async function addRecipeEntry(dayName: DayName, recipeId: number) {
    if (!mealPlan) return

    const foundRecipe = recipes.find((recipe) => recipe.id === recipeId)

    if (!foundRecipe) {
      setMessage(t('mealPlanner.recipeNotFound'))
      return
    }

    const position = getEntriesForDay(dayName).length

    const { error } = await supabase
      .from('meal_plan_entries')
      .insert({
        meal_plan_id: mealPlan.id,
        day_name: dayName,
        entry_type: 'recipe',
        recipe_id: recipeId,
        position,
      })

    if (error) {
      setMessage(`Add recipe error: ${error.message}`)
      return
    }

    setOpenRecipePickerDay(null)
    setRecipeSearchText('')
    await refreshPlannerData(mealPlan.id)
  }

  async function deleteEntry(entryId: number) {
    if (!mealPlan) return

    const { error } = await supabase
      .from('meal_plan_entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      setMessage(`Delete entry error: ${error.message}`)
      return
    }

    setConfirmDeleteEntryId(null)
    await refreshPlannerData(mealPlan.id)
  }

  async function syncRecipeShoppingItems(mealPlanId: number, entriesToUse: MealPlanEntry[]) {
    const recipeIds = entriesToUse
      .filter((entry) => entry.entry_type === 'recipe' && entry.recipe_id)
      .map((entry) => entry.recipe_id) as number[]

    const { data: existingRecipeItems } = await supabase
      .from('shopping_list_items')
      .select('id, item_name, unit, is_checked')
      .eq('meal_plan_id', mealPlanId)
      .eq('source_type', 'recipe')

    const existingCheckedMap = new Map<string, boolean>()

    ;(existingRecipeItems || []).forEach((item: any) => {
      const key = `${item.item_name || ''}-${item.unit || ''}`
      existingCheckedMap.set(key, item.is_checked === true)
    })

    await supabase
      .from('shopping_list_items')
      .delete()
      .eq('meal_plan_id', mealPlanId)
      .eq('source_type', 'recipe')

    if (recipeIds.length === 0) return

    const { data: recipeIngredients, error } = await supabase
      .from('Recipe_ingredients')
      .select('*')
      .in('Recipe_id', recipeIds)

    if (error) {
      console.log('shopping list sync error:', error)
      return
    }

    if (!recipeIngredients || recipeIngredients.length === 0) return

    const ingredientIds = recipeIngredients.map((item) => item.Ingredient_id)

    const { data: ingredientNames, error: ingredientError } = await supabase
      .from('Ingredients')
      .select('id, Name')
      .in('id', ingredientIds)

    if (ingredientError) {
      console.log('ingredient name load error:', ingredientError)
      return
    }

    const ingredientMap = new Map(
      (ingredientNames || []).map((i: any) => [i.id, i.Name])
    )

    const combinedMap = new Map<
      string,
      {
        item_name: string
        amount: string | null
        unit: string | null
        is_checked: boolean
      }
    >()

    recipeIngredients.forEach((item: any) => {
      const itemName = ingredientMap.get(item.Ingredient_id) || t('mealPlanner.unknownIngredient')
      const unit = item.Unit ? String(item.Unit) : null
      const key = `${itemName}-${unit || ''}`

      if (!combinedMap.has(key)) {
        combinedMap.set(key, {
          item_name: itemName,
          amount: item.Amount ? String(item.Amount) : null,
          unit,
          is_checked: existingCheckedMap.get(key) === true,
        })
      } else {
        const existing = combinedMap.get(key)!

        const existingAmount = parseFloat(existing.amount || '0')
        const newAmount = parseFloat(item.Amount || '0')

        if (!isNaN(existingAmount) && !isNaN(newAmount)) {
          existing.amount = String(existingAmount + newAmount)
        }
      }
    })

    const rowsToInsert = Array.from(combinedMap.values())
      .filter((item) => item.item_name && item.item_name.trim() !== '')
      .map((item, index) => ({
        meal_plan_id: mealPlanId,
        item_name: item.item_name,
        amount: item.amount,
        unit: item.unit,
        source_type: 'recipe',
        is_checked: item.is_checked,
        position: index,
      }))

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('shopping_list_items')
        .insert(rowsToInsert)

      if (insertError) {
        console.log('shopping list recipe insert error:', insertError)
      }
    }
  }

  async function addManualShoppingItem() {
    if (!mealPlan) return

    const trimmed = manualItem.trim()
    if (!trimmed) return

    const manualCount = shoppingList.filter((item) => item.source_type === 'manual').length

    const { error } = await supabase
      .from('shopping_list_items')
      .insert({
        meal_plan_id: mealPlan.id,
        item_name: trimmed,
        amount: null,
        unit: null,
        source_type: 'manual',
        is_checked: false,
        position: manualCount,
      })

    if (error) {
      setMessage(`Add shopping item error: ${error.message}`)
      return
    }

    setManualItem('')
    await loadStoredShoppingList(mealPlan.id)
  }

  async function deleteShoppingListItem(itemId: number) {
    if (!mealPlan) return

    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      setMessage(`Delete shopping item error: ${error.message}`)
      return
    }

    await loadStoredShoppingList(mealPlan.id)
  }

  async function toggleShoppingItem(item: ShoppingListItem) {
    if (!mealPlan) return

    const { error } = await supabase
      .from('shopping_list_items')
      .update({ is_checked: !item.is_checked })
      .eq('id', item.id)

    if (error) {
      setMessage(`Update error: ${error.message}`)
      return
    }

    await loadStoredShoppingList(mealPlan.id)
  }

  async function clearCheckedItems() {
    if (!mealPlan) return

    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('meal_plan_id', mealPlan.id)
      .eq('is_checked', true)

    if (error) {
      setMessage(`Clear checked error: ${error.message}`)
      return
    }

    await loadStoredShoppingList(mealPlan.id)
  }

  const isMobile = windowWidth < 760

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.Name.toLowerCase().includes(recipeSearchText.toLowerCase())
  )

  const sortedShoppingList = [...shoppingList].sort((a, b) => {
    return Number(a.is_checked) - Number(b.is_checked)
  })

  if (loading) {
    return <div style={{ padding: 40 }}>{t('mealPlanner.loading')}</div>
  }

  if (!currentUserId) {
    return (
      <div style={{ padding: 40, maxWidth: '900px', margin: '0 auto' }}>
        <Link href={`/${locale}`} style={{ display: 'block', marginBottom: '20px' }}>
          ← {t('mealPlanner.backToRecipes')}
        </Link>
        <p>{t('mealPlanner.mustBeLoggedIn')}</p>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: isMobile ? '20px 14px 40px' : '40px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      <Link href={`/${locale}`} style={{ display: 'inline-block', marginBottom: '20px' }}>
        ← {t('mealPlanner.backToRecipes')}
      </Link>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1
          style={{
            fontSize: isMobile ? '34px' : '48px',
            fontWeight: '900',
            marginBottom: '8px',
          }}
        >
          {t('mealPlanner.title')}
        </h1>

        <p style={{ color: '#aaa', margin: 0 }}>
          {t('mealPlanner.weekOf')} {formatPrettyDate(new Date(`${weekStart}T00:00:00`), locale)}
        </p>
      </div>

      {message && (
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>
          {message}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 340px',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px',
          }}
        >
          {dayOrder.map((dayName, index) => {
            const dayEntries = getEntriesForDay(dayName)

            return (
              <div
                key={dayName}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '14px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '18px 18px 14px' }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: isMobile ? '28px' : '34px',
                      fontWeight: 800,
                    }}
                  >
                    {dayLabels[dayName]}
                  </h2>

                  <p style={{ margin: '4px 0 16px', color: '#aaa' }}>
                    {getDateForDay(weekStart, index, locale)}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenRecipePickerDay((prev) => (prev === dayName ? null : dayName))
                        setRecipeSearchText('')
                        setManualEntryDay(null)
                        setManualEntryText('')
                        setNoteEntryDay(null)
                        setNoteEntryText('')
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        background: '#111',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1.2,
                      }}
                    >
                      {t('mealPlanner.addRecipe')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setManualEntryDay((prev) => (prev === dayName ? null : dayName))
                        setOpenRecipePickerDay(null)
                        setRecipeSearchText('')
                        setManualEntryText('')
                        setNoteEntryDay(null)
                        setNoteEntryText('')
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        background: '#111',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1.2,
                      }}
                    >
                      {t('mealPlanner.addMealText')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNoteEntryDay((prev) => (prev === dayName ? null : dayName))
                        setOpenRecipePickerDay(null)
                        setRecipeSearchText('')
                        setManualEntryDay(null)
                        setManualEntryText('')
                        setNoteEntryText('')
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        background: '#111',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1.2,
                      }}
                    >
                      {t('mealPlanner.addNote')}
                    </button>

                    {openRecipePickerDay === dayName && (
                      <div
                        style={{
                          width: '100%',
                          marginTop: '14px',
                          border: '1px solid #333',
                          borderRadius: '10px',
                          background: '#111',
                          padding: '12px',
                        }}
                      >
                        <input
                          value={recipeSearchText}
                          onChange={(e) => setRecipeSearchText(e.target.value)}
                          placeholder="Search recipes..."
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            background: '#0d0d0d',
                            color: 'white',
                            marginBottom: '10px',
                          }}
                        />

                        <div
                          style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            border: filteredRecipes.length > 0 ? '1px solid #222' : 'none',
                            borderRadius: '8px',
                          }}
                        >
                          {recipes.length === 0 ? (
                            <p style={{ padding: '14px', margin: 0, color: '#aaa' }}>
                              {t('mealPlanner.noRecipesAvailable')}
                            </p>
                          ) : filteredRecipes.length === 0 ? (
                            <p style={{ padding: '14px', margin: 0, color: '#aaa' }}>
                              No matching recipes found.
                            </p>
                          ) : (
                            filteredRecipes.map((recipe) => (
                              <button
                                key={recipe.id}
                                type="button"
                                onClick={() => addRecipeEntry(dayName, recipe.id)}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '10px 12px',
                                  border: 'none',
                                  borderBottom: '1px solid #222',
                                  background: 'transparent',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                }}
                              >
                                {recipe.Name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {manualEntryDay === dayName && (
                      <div
                        style={{
                          width: '100%',
                          marginTop: '14px',
                          border: '1px solid #333',
                          borderRadius: '10px',
                          background: '#111',
                          padding: '12px',
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <input
                          value={manualEntryText}
                          onChange={(e) => setManualEntryText(e.target.value)}
                          placeholder="Leftovers, takeout, sandwiches..."
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            background: '#0d0d0d',
                            color: 'white',
                            minWidth: '120px',
                          }}
                        />

                        <button
                          type="button"
                          onClick={saveManualEntry}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            background: '#1a1a1a',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setManualEntryDay(null)
                            setManualEntryText('')
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            background: '#0d0d0d',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {noteEntryDay === dayName && (
                      <div
                        style={{
                          width: '100%',
                          marginTop: '14px',
                          border: '1px solid #333',
                          borderRadius: '10px',
                          background: '#111',
                          padding: '12px',
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <input
                          value={noteEntryText}
                          onChange={(e) => setNoteEntryText(e.target.value)}
                          placeholder="Prep ahead, defrost meat, use leftovers..."
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            background: '#0d0d0d',
                            color: 'white',
                            minWidth: '120px',
                          }}
                        />

                        <button
                          type="button"
                          onClick={saveNoteEntry}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            background: '#1a1a1a',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNoteEntryDay(null)
                            setNoteEntryText('')
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            background: '#0d0d0d',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {dayEntries.length > 0 && (
                  <div style={{ borderTop: '1px solid #2a2a2a' }}>
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          padding: '14px 18px',
                          borderTop: '1px solid #2a2a2a',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {entry.entry_type === 'recipe' && entry.recipe ? (
                            <div
                              style={{
                                display: 'flex',
                                gap: '14px',
                                alignItems: 'center',
                              }}
                            >
                              {entry.recipe.Image_url ? (
                                <img
                                  src={entry.recipe.Image_url}
                                  alt={entry.recipe.Name}
                                  style={{
                                    width: isMobile ? '84px' : '100px',
                                    height: isMobile ? '84px' : '100px',
                                    objectFit: 'cover',
                                    borderRadius: '10px',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: isMobile ? '84px' : '100px',
                                    height: isMobile ? '84px' : '100px',
                                    borderRadius: '10px',
                                    background: '#222',
                                    border: '1px solid #333',
                                    flexShrink: 0,
                                  }}
                                />
                              )}

                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: isMobile ? '20px' : '24px',
                                    fontWeight: 700,
                                    marginBottom: '4px',
                                  }}
                                >
                                  {entry.recipe.Name}
                                </div>

                                <div style={{ color: '#cfcfcf', lineHeight: 1.5 }}>
                                  {getTranslatedCategory(entry.recipe.Category)}
                                  <br />
                                  {t('home.prep')} {entry.recipe.Prep_time ?? '-'} {t('home.min')}
                                  <br />
                                  {t('home.cook')} {entry.recipe.Cook_time ?? '-'} {t('home.min')}
                                </div>

                                {entry.note && (
                                  <p style={{ marginTop: '8px', color: '#aaa' }}>
                                    {t('mealPlanner.noteLabel')}: {entry.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  fontSize: isMobile ? '18px' : '20px',
                                  fontWeight: 600,
                                  marginBottom: entry.note ? '6px' : 0,
                                }}
                              >
                                {entry.text}
                              </div>

                              {entry.note && (
                                <p style={{ margin: 0, color: '#aaa' }}>
                                  {entry.note}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {confirmDeleteEntryId === entry.id ? (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              flexShrink: 0,
                              flexWrap: 'wrap',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => deleteEntry(entry.id)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #663333',
                                background: '#2a1111',
                                color: 'white',
                                cursor: 'pointer',
                              }}
                            >
                              Confirm delete
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteEntryId(null)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #333',
                                background: '#111',
                                color: 'white',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteEntryId(entry.id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #333',
                              background: '#111',
                              color: 'white',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {t('mealPlanner.delete')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '14px',
            padding: '18px',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : '84px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ margin: 0 }}>{t('mealPlanner.shoppingList')}</h2>

            {shoppingList.some((item) => item.is_checked) && (
              <button
                type="button"
                onClick={clearCheckedItems}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#111',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                {t('mealPlanner.clearChecked')}
              </button>
            )}
          </div>

          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
            <input
              value={manualItem}
              onChange={(e) => setManualItem(e.target.value)}
              placeholder={t('mealPlanner.addItemPlaceholder')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#111',
                color: 'white',
              }}
            />

            <button
              type="button"
              onClick={addManualShoppingItem}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#111',
                color: 'white',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              +
            </button>
          </div>

          {sortedShoppingList.length === 0 ? (
            <p style={{ color: '#aaa', margin: 0 }}>{t('mealPlanner.noItemsYet')}</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {sortedShoppingList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 12px',
                    border: '1px solid #2a2a2a',
                    borderRadius: '10px',
                    background: '#111',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      onClick={() => toggleShoppingItem(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: '1px solid #555',
                          background: item.is_checked ? '#444' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {item.is_checked ? '✓' : ''}
                      </div>

                      <span
                        style={{
                          wordBreak: 'break-word',
                          textDecoration: item.is_checked ? 'line-through' : 'none',
                          color: item.is_checked ? '#777' : 'white',
                        }}
                      >
                        {formatShoppingItemLabel(item)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteShoppingListItem(item.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #333',
                      background: '#0d0d0d',
                      color: 'white',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}