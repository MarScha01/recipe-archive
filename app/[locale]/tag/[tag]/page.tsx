'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { slugify } from '../../../../lib/slugify'
import { useLocale } from 'next-intl'

export default function TagPage() {
  const params = useParams()
  const tag = params.tag?.toString().toLowerCase()

  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const locale = useLocale()

  useEffect(() => {
    if (tag) {
      fetchRecipes()
    }
  }, [tag])

  async function fetchRecipes() {
    setLoading(true)

    const { data, error } = await supabase
      .from('Recipes')
      .select('*')
      .eq('is_public', true)
      .ilike('Tags', `%${tag}%`)

    if (error) {
      console.log(error)
    } else {
      setRecipes(data || [])
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 40, maxWidth: '1100px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'block', marginBottom: '20px' }}>
        ← Back to recipes
      </Link>

      <h1
        style={{
          fontSize: '40px',
          fontWeight: 800,
          marginBottom: '30px'
        }}
      >
        Recipes tagged: {tag}
      </h1>

      {loading && <p>Loading recipes...</p>}

      {!loading && recipes.length === 0 && (
        <p>No public recipes found with this tag.</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px'
        }}
      >
        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/${locale}/recipe/${recipe.id}-${slugify(recipe.Name)}`}
            style={{
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <div
              style={{
                padding: '18px',
                border: '1px solid #2a2a2a',
                borderRadius: '10px',
                display: 'flex',
                gap: '18px',
                alignItems: 'center',
                background: '#1a1a1a',
                cursor: 'pointer'
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
                    borderRadius: '10px'
                  }}
                />
              )}

              <div>
                <h2 style={{ marginBottom: '6px' }}>
                  {recipe.Name}
                </h2>

                <p style={{ margin: 0 }}>
                  {recipe.Category}
                </p>

                <p style={{ margin: 0 }}>
                  Prep {recipe.Prep_time} min • Cook {recipe.Cook_time} min
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}