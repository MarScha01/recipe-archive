'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function RecipePageClient() {
  const params = useParams()

  // Route looks like: /recipe/12-spaghetti-bolognese
  // We only need the numeric ID at the start
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id
  const recipeId = Number(String(rawId).split('-')[0])

  const [recipe, setRecipe] = useState<any>(null)
  const [ingredients, setIngredients] = useState<any[]>([])
  const [creatorName, setCreatorName] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [canView, setCanView] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentMessage, setCommentMessage] = useState('')

  useEffect(() => {
    // Default tab title before recipe loads
    document.title = 'Recipe Archive'

    if (recipeId) {
      fetchRecipe()
    }
  }, [recipeId])

  async function fetchRecipe() {
    setCheckingAccess(true)
    setErrorMessage('')

    // Stop early if the URL does not contain a valid numeric recipe ID
    if (!recipeId || Number.isNaN(recipeId)) {
      setErrorMessage('Invalid recipe link.')
      setCheckingAccess(false)
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData.user
    setCurrentUserId(currentUser?.id || null)

    // Load the recipe by numeric ID
    const { data: recipeData, error: recipeError } = await supabase
      .from('Recipes')
      .select('*')
      .eq('id', recipeId)
      .single()

    if (recipeError) {
      setErrorMessage(`Recipe error: ${recipeError.message}`)
      setCheckingAccess(false)
      return
    }

    let admin = false
    let owner = false

    if (currentUser) {
      owner = recipeData.user_id === currentUser.id

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .maybeSingle()

      admin = currentProfile?.is_admin === true
      setIsAdmin(admin)
    } else {
      setIsAdmin(false)
    }

    // Public recipes can be viewed by everyone
    // Private recipes can only be viewed by owner or admin
    const allowedToView = recipeData.is_public === true || owner || admin

    if (!allowedToView) {
      setCanView(false)
      setCheckingAccess(false)
      return
    }

    setCanView(true)
    setCanEdit(owner || admin)
    setRecipe(recipeData)

    // Update browser tab title after recipe loads
    document.title = `Recipe Archive | ${recipeData.Name}`

    // Load creator display name / username
    if (recipeData.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', recipeData.user_id)
        .maybeSingle()

      if (profileData) {
        setCreatorName(profileData.display_name || profileData.username || '')
      }
    }

    // Load ingredient rows linked to this recipe
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('Recipe_ingredients')
      .select('*')
      .eq('Recipe_id', recipeId)

    if (ingredientsError) {
      setErrorMessage(`Ingredients error: ${ingredientsError.message}`)
      setCheckingAccess(false)
      return
    }

    if (!ingredientsData || ingredientsData.length === 0) {
      setIngredients([])
    } else {
      const ingredientIds = ingredientsData.map((item) => item.Ingredient_id)

      // Load actual ingredient names from Ingredients table
      const { data: ingredientNames, error: namesError } = await supabase
        .from('Ingredients')
        .select('id, Name')
        .in('id', ingredientIds)

      if (namesError) {
        setErrorMessage(`Ingredient names error: ${namesError.message}`)
        setCheckingAccess(false)
        return
      }

      const mergedIngredients = ingredientsData.map((item) => {
        const matchingIngredient = ingredientNames?.find(
          (ingredient) => String(ingredient.id) === String(item.Ingredient_id)
        )

        return {
          ...item,
          IngredientName: matchingIngredient ? matchingIngredient.Name : 'Unknown ingredient'
        }
      })

      setIngredients(mergedIngredients)
    }

    await loadComments()
    setCheckingAccess(false)
  }

  async function loadComments() {
    const { data: commentRows, error } = await supabase
      .from('recipe_comments')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('comments load error:', error)
      return
    }

    if (!commentRows || commentRows.length === 0) {
      setComments([])
      return
    }

    const userIds = [...new Set(commentRows.map((comment) => comment.user_id))]

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds)

    if (profilesError) {
      console.log('comment profile load error:', profilesError)
      setComments(commentRows)
      return
    }

    const commentsWithNames = commentRows.map((comment) => {
      const author = profilesData?.find((profile) => profile.id === comment.user_id)

      return {
        ...comment,
        authorName: author?.display_name || author?.username || 'Unknown user'
      }
    })

    setComments(commentsWithNames)
  }

  async function addComment() {
    setCommentMessage('')

    const trimmed = newComment.trim()

    if (!trimmed) {
      setCommentMessage('Write a comment first.')
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setCommentMessage('You must be logged in to comment.')
      return
    }

    const { error } = await supabase
      .from('recipe_comments')
      .insert({
        recipe_id: recipeId,
        user_id: user.id,
        content: trimmed
      })

    if (error) {
      setCommentMessage(`Comment error: ${error.message}`)
      return
    }

    setNewComment('')
    setCommentMessage('')
    await loadComments()
  }

  async function deleteComment(commentId: number) {
    const confirmed = window.confirm('Delete this comment?')
    if (!confirmed) return

    const { error } = await supabase
      .from('recipe_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      setCommentMessage(`Delete comment error: ${error.message}`)
      return
    }

    await loadComments()
  }

  if (checkingAccess) {
    return <div style={{ padding: 40 }}>Loading recipe...</div>
  }

  if (!canView) {
    return (
      <div style={{ padding: 40, maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'block', marginBottom: '20px' }}>
          ← Back to recipes
        </Link>
        <p>This recipe is private.</p>
      </div>
    )
  }

  if (errorMessage) {
    return <div style={{ padding: 40 }}>{errorMessage}</div>
  }

  if (!recipe) {
    return <div style={{ padding: 40 }}>Loading recipe...</div>
  }

  // Turn instructions into a clean list
  const instructionSteps = recipe.Instructions
    ? recipe.Instructions
        .split('\n')
        .map((step: string) => step.trim())
        .filter((step: string) => step.length > 0)
    : []

  // Turn tag string into individual tags
  const tagList = recipe.Tags
    ? recipe.Tags.split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0)
    : []

  return (
    <div style={{ padding: 40, maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <Link href="/">← Back to recipes</Link>

        {canEdit && <Link href={`/edit/${recipe.id}`}>Edit recipe</Link>}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h1
          style={{
            fontSize: '40px',
            fontWeight: '800',
            marginBottom: '10px',
            letterSpacing: '0.5px'
          }}
        >
          {recipe.Name}
        </h1>

        <p style={{ margin: '4px 0' }}>Category: {recipe.Category}</p>

        {creatorName && <p style={{ margin: '4px 0' }}>Created by: {creatorName}</p>}

        <p style={{ margin: '4px 0' }}>
          Prep: {recipe.Prep_time} minutes
          <span style={{ marginLeft: '20px' }}>Cook: {recipe.Cook_time} minutes</span>
        </p>

        {tagList.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '14px'
            }}
          >
            {tagList.map((tag: string, index: number) => (
              <Link
                key={index}
                href={`/tag/${tag}`}
                style={{
                  padding: '6px 10px',
                  borderRadius: '16px',
                  border: '1px solid #333',
                  background: '#1a1a1a',
                  fontSize: '14px',
                  textDecoration: 'none',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '40px',
          flexWrap: 'wrap',
          marginBottom: '40px'
        }}
      >
        <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
          <h2 style={{ marginBottom: '16px' }}>Ingredients</h2>

          {ingredients.length > 0 ? (
            <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              {ingredients.map((item, i) => (
                <li key={i}>{[item.Amount, item.Unit, item.IngredientName].filter(Boolean).join(' ')}</li>
              ))}
            </ul>
          ) : (
            <p>No ingredients found.</p>
          )}
        </div>

        {recipe.Image_url && (
          <div
            style={{
              flex: '1 1 260px',
              minWidth: '220px',
              maxWidth: '380px',
              width: '100%'
            }}
          >
            <img
              src={recipe.Image_url}
              alt={recipe.Name}
              style={{
                width: '100%',
                minWidth: '220px',
                maxWidth: '380px',
                height: 'auto',
                display: 'block',
                borderRadius: '14px'
              }}
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '16px' }}>Instructions</h2>

        {instructionSteps.length > 0 ? (
          <ol style={{ paddingLeft: '24px', lineHeight: 1.8, margin: 0 }}>
            {instructionSteps.map((step: string, i: number) => (
              <li key={i} style={{ marginBottom: '10px' }}>
                {step}
              </li>
            ))}
          </ol>
        ) : (
          <p>No instructions yet.</p>
        )}
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '12px' }}>Notes</h2>
        <p>{recipe.Notes || 'No notes'}</p>
      </div>

      <div>
        <h2 style={{ marginBottom: '16px' }}>Comments</h2>

        {currentUserId ? (
          <div style={{ marginBottom: '20px' }}>
            <textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #333',
                background: '#1a1a1a',
                color: 'white',
                marginBottom: '10px'
              }}
            />

            <button
              type="button"
              onClick={addComment}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#1a1a1a',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Add comment
            </button>

            {commentMessage && <p style={{ marginTop: '10px' }}>{commentMessage}</p>}
          </div>
        ) : (
          <p style={{ marginBottom: '20px' }}>Log in to add a comment.</p>
        )}

        {comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {comments.map((comment) => {
              const canDeleteComment = currentUserId === comment.user_id || isAdmin

              return (
                <div
                  key={comment.id}
                  style={{
                    border: '1px solid #2a2a2a',
                    borderRadius: '10px',
                    padding: '14px',
                    background: '#1a1a1a'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}
                  >
                    <strong>{comment.authorName}</strong>

                    {canDeleteComment && (
                      <button
                        type="button"
                        onClick={() => deleteComment(comment.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #333',
                          background: '#111',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comment.content}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}