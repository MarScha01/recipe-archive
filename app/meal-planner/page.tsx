'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

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

const dayOrder: DayName[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const dayLabels: Record<DayName, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

/**
 * Get Monday of the current week
 */
function getMondayOfCurrentWeek() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Convert date to YYYY-MM-DD for database storage
 */
function formatDateForDb(date: Date) {
  return date.toISOString().split('T')[0]
}

/**
 * Pretty date for UI
 */
function formatPrettyDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get actual date for a day in the current week
 */
function getDateForDay(weekStart: string, index: number) {
  const date = new Date(`${weekStart}T00:00:00`)
  date.setDate(date.getDate() + index)
  return formatPrettyDate(date)
}

export default function MealPlannerPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [windowWidth, setWindowWidth] = useState(1200)

  /**
   * Which day currently has the recipe picker open
   */
  const [openRecipePickerDay, setOpenRecipePickerDay] = useState<DayName | null>(null)

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

  async function loadPage() {
    setLoading(true)
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setMessage('You must be logged in to use the meal planner.')
      setLoading(false)
      return
    }

    const userId = authData.user.id
    setCurrentUserId(userId)

    const loadedPlan = await getOrCreateMealPlan(userId, weekStart)

    if (!loadedPlan) {
      setMessage('Could not load meal plan.')
      setLoading(false)
      return
    }

    setMealPlan(loadedPlan)

    await Promise.all([
      loadEntries(loadedPlan.id),
      loadRecipes(userId),
    ])

    setLoading(false)
  }

  /**
   * Find existing meal plan for this user + week,
   * or create it if it doesn't exist yet
   */
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

  /**
   * Load all entries for the current meal plan
   */
  async function loadEntries(mealPlanId: number) {
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
      return
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
  }

  /**
   * Load recipes the user can add:
   * - public recipes
   * - or their own recipes
   */
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

  function getEntriesForDay(dayName: DayName) {
    return entries.filter((entry) => entry.day_name === dayName)
  }

  /**
   * Add a manual meal text like "leftovers" or "takeout"
   */
  async function addManualEntry(dayName: DayName) {
    if (!mealPlan) return

    const text = window.prompt('Enter meal text, for example: leftovers or takeout')
    if (!text || !text.trim()) return

    const position = getEntriesForDay(dayName).length

    const { error } = await supabase
      .from('meal_plan_entries')
      .insert({
        meal_plan_id: mealPlan.id,
        day_name: dayName,
        entry_type: 'manual',
        text: text.trim(),
        position,
      })

    if (error) {
      setMessage(`Add entry error: ${error.message}`)
      return
    }

    await loadEntries(mealPlan.id)
  }

  /**
   * Add a note-only entry for the day
   */
  async function addNoteToDay(dayName: DayName) {
    if (!mealPlan) return

    const note = window.prompt('Enter a note for this day')
    if (!note || !note.trim()) return

    const position = getEntriesForDay(dayName).length

    const { error } = await supabase
      .from('meal_plan_entries')
      .insert({
        meal_plan_id: mealPlan.id,
        day_name: dayName,
        entry_type: 'manual',
        text: 'Note',
        note: note.trim(),
        position,
      })

    if (error) {
      setMessage(`Add note error: ${error.message}`)
      return
    }

    await loadEntries(mealPlan.id)
  }

  /**
   * Add a recipe entry after user clicks a recipe in the inline picker
   */
  async function addRecipeEntry(dayName: DayName, recipeId: number) {
    if (!mealPlan) return

    const foundRecipe = recipes.find((recipe) => recipe.id === recipeId)

    if (!foundRecipe) {
      setMessage('Recipe not found.')
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
    await loadEntries(mealPlan.id)
  }

  /**
   * Delete one entry from the planner
   */
  async function deleteEntry(entryId: number) {
    if (!mealPlan) return

    const confirmed = window.confirm('Delete this entry?')
    if (!confirmed) return

    const { error } = await supabase
      .from('meal_plan_entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      setMessage(`Delete entry error: ${error.message}`)
      return
    }

    await loadEntries(mealPlan.id)
  }

  const isMobile = windowWidth < 760

  if (loading) {
    return <div style={{ padding: 40 }}>Loading meal planner...</div>
  }

  if (!currentUserId) {
    return (
      <div style={{ padding: 40, maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'block', marginBottom: '20px' }}>
          ← Back to recipes
        </Link>
        <p>You must be logged in to use the meal planner.</p>
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
      <Link href="/" style={{ display: 'inline-block', marginBottom: '20px' }}>
        ← Back to recipes
      </Link>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1
          style={{
            fontSize: isMobile ? '34px' : '48px',
            fontWeight: '900',
            marginBottom: '8px',
          }}
        >
          Meal planner
        </h1>

        <p style={{ color: '#aaa', margin: 0 }}>
          Week of {formatPrettyDate(new Date(`${weekStart}T00:00:00`))}
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
                  {getDateForDay(weekStart, index)}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRecipePickerDay((prev) => (prev === dayName ? null : dayName))
                    }
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #333',
                      background: '#111',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    + Add recipe
                  </button>

                  <button
                    type="button"
                    onClick={() => addManualEntry(dayName)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #333',
                      background: '#111',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    + Add meal text
                  </button>

                  <button
                    type="button"
                    onClick={() => addNoteToDay(dayName)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #333',
                      background: '#111',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    + Add note
                  </button>

                  {/* Inline recipe picker */}
                  {openRecipePickerDay === dayName && (
                    <div
                      style={{
                        width: '100%',
                        marginTop: '14px',
                        border: '1px solid #333',
                        borderRadius: '10px',
                        background: '#111',
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}
                    >
                      {recipes.length === 0 ? (
                        <p style={{ padding: '14px', margin: 0, color: '#aaa' }}>
                          No recipes available yet.
                        </p>
                      ) : (
                        recipes.map((recipe) => (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => addRecipeEntry(dayName, recipe.id)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '12px 14px',
                              border: 'none',
                              borderBottom: '1px solid #222',
                              background: 'transparent',
                              color: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            {recipe.Name}
                          </button>
                        ))
                      )}
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
                                {entry.recipe.Category || 'Uncategorized'}
                                <br />
                                Prep {entry.recipe.Prep_time ?? '-'} min
                                <br />
                                Cook {entry.recipe.Cook_time ?? '-'} min
                              </div>

                              {entry.note && (
                                <p style={{ marginTop: '8px', color: '#aaa' }}>
                                  Note: {entry.note}
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

                      <button
                        type="button"
                        onClick={() => deleteEntry(entry.id)}
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
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}