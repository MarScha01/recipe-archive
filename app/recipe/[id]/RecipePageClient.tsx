'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Recipe = {
  id: number
  Name: string
  Category: string | null
  Prep_time: number | null
  Cook_time: number | null
  Image_url: string | null
  Instructions: string | null
  Notes: string | null
  Tags: string | null
  user_id: string | null
  is_public: boolean | null
}

type IngredientRow = {
  Amount: string | null
  Unit: string | null
  IngredientName: string
}

type Props = {
  recipe: Recipe
  ingredients: IngredientRow[]
  creatorName: string
  canEditInitial: boolean
}

export default function RecipePageClient({
  recipe,
  ingredients,
  creatorName,
  canEditInitial,
}: Props) {
  const [canEdit, setCanEdit] = useState(canEditInitial)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentMessage, setCommentMessage] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('recentRecipes')
    let recent = stored ? JSON.parse(stored) : []

    recent = recent.filter((item: any) => item.id !== recipe.id)

    recent.unshift({
      id: recipe.id,
      name: recipe.Name,
      image: recipe.Image_url,
      slug: `${recipe.id}-${recipe.Name.toLowerCase().replace(/\s+/g, '-')}`,
    })

    recent = recent.slice(0, 10)

    localStorage.setItem('recentRecipes', JSON.stringify(recent))
  }, [recipe])

  useEffect(() => {
    checkUser()
    loadComments()
  }, [recipe.id])

  async function checkUser() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    setCurrentUserId(user?.id || null)

    if (!user) {
      setIsAdmin(false)
      return
    }

    const isOwner = recipe.user_id === user.id

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    const admin = currentProfile?.is_admin === true
    setIsAdmin(admin)
    setCanEdit(isOwner || admin || canEditInitial)
  }

  async function loadComments() {
    const { data: commentRows, error } = await supabase
      .from('recipe_comments')
      .select('*')
      .eq('recipe_id', recipe.id)
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
        authorName: author?.display_name || author?.username || 'Unknown user',
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

    const { error } = await supabase.from('recipe_comments').insert({
      recipe_id: recipe.id,
      user_id: user.id,
      content: trimmed,
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

    const { error } = await supabase.from('recipe_comments').delete().eq('id', commentId)

    if (error) {
      setCommentMessage(`Delete comment error: ${error.message}`)
      return
    }

    await loadComments()
  }

  const instructionSteps = recipe.Instructions
    ? recipe.Instructions
        .split('\n')
        .map((step: string) => step.trim())
        .filter((step: string) => step.length > 0)
    : []

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
            letterSpacing: '0.5px',
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
              marginTop: '14px',
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
                  cursor: 'pointer',
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
          marginBottom: '40px',
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
              width: '100%',
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
                borderRadius: '14px',
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
                marginBottom: '10px',
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
                cursor: 'pointer',
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
                    background: '#1a1a1a',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      alignItems: 'center',
                      marginBottom: '8px',
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
                          cursor: 'pointer',
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