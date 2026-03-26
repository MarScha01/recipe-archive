import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import RecipePageClient from './RecipePageClient'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

/**
 * Server-side Supabase client for metadata fetching
 * Uses your public anon key from env vars
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Extract numeric recipe ID from URL like:
 * 12-spaghetti-bolognese
 */
function getRecipeIdFromParam(rawId: string) {
  const idPart = rawId.split('-')[0]
  const recipeId = Number(idPart)

  if (!recipeId || Number.isNaN(recipeId)) {
    return null
  }

  return recipeId
}

/**
 * Dynamic SEO metadata for recipe pages
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const recipeId = getRecipeIdFromParam(id)

  if (!recipeId) {
    return {
      title: 'Recipe not found',
      description: 'This recipe could not be found.',
    }
  }

  const { data: recipe } = await supabase
    .from('Recipes')
    .select('Name, Category, Prep_time, Cook_time, is_public')
    .eq('id', recipeId)
    .maybeSingle()

  if (!recipe) {
    return {
      title: 'Recipe not found',
      description: 'This recipe could not be found.',
    }
  }

  /**
   * Don't expose private recipe details in metadata
   */
  if (recipe.is_public !== true) {
    return {
      title: 'Private recipe',
      description: 'This recipe is private.',
    }
  }

  const descriptionParts = [
    recipe.Category ? `Category: ${recipe.Category}` : null,
    recipe.Prep_time ? `Prep time: ${recipe.Prep_time} min` : null,
    recipe.Cook_time ? `Cook time: ${recipe.Cook_time} min` : null,
  ].filter(Boolean)

  return {
    title: recipe.Name,
    description:
      descriptionParts.length > 0
        ? `${recipe.Name}. ${descriptionParts.join('. ')}.`
        : `Learn how to make ${recipe.Name}.`,
    openGraph: {
      title: recipe.Name,
      description:
        descriptionParts.length > 0
          ? `${recipe.Name}. ${descriptionParts.join('. ')}.`
          : `Learn how to make ${recipe.Name}.`,
      type: 'article',
    },
  }
}

/**
 * Render the existing client-side recipe page
 */
export default function Page() {
  return <RecipePageClient />
}