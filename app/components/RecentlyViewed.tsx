'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function RecentlyViewed() {
  const [recipes, setRecipes] = useState<any[]>([])
  const t = useTranslations()

  useEffect(() => {
    const stored = localStorage.getItem('recentRecipes')
    if (stored) {
      setRecipes(JSON.parse(stored))
    }
  }, [])

  if (recipes.length === 0) return null

  return (
    <div style={{ marginTop: '40px' }}>
      <h2 style={{ marginBottom: '16px' }}>{t('recentlyViewed.title')}</h2>

      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipe/${recipe.slug}`}
            style={{
              minWidth: '140px',
              textDecoration: 'none',
              color: 'white',
            }}
          >
            <div
              style={{
                border: '1px solid #2a2a2a',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#1a1a1a',
              }}
            >
              {recipe.image ? (
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100px',
                    background: '#222',
                    borderBottom: '1px solid #333',
                    display: 'block',
                  }}
                />
              )}

              {/* Centered title */}
              <div
                style={{
                  padding: '8px',
                  fontSize: '14px',
                  textAlign: 'center',          // horizontal center
                  display: 'flex',              // enable vertical centering
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '50px',            // keeps all cards same height
                  lineHeight: 1.2,
                }}
              >
                {recipe.name}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}