import type { Metadata } from 'next'
import Script from 'next/script'
import { createClient } from '@supabase/supabase-js'
import RecipePageClient from './RecipePageClient'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getRecipeIdFromParam(rawId: string) {
  const idPart = rawId.split('-')[0]
  const recipeId = Number(idPart)

  if (!recipeId || Number.isNaN(recipeId)) {
    return null
  }

  return recipeId
}

async function getRecipeForSeo(rawId: string) {
  const recipeId = getRecipeIdFromParam(rawId)

  if (!recipeId) return null

  const { data: recipe } = await supabase
    .from('Recipes')
    .select('id, Name, Category, Prep_time, Cook_time, Notes, Image_url, Tags, Instructions, is_public')
    .eq('id', recipeId)
    .maybeSingle()

  if (!recipe || recipe.is_public !== true) {
    return null
  }

  return recipe
}

function createRecipeJsonLd(recipe: any) {
  if (!recipe) return null

  const instructionSteps =
    recipe.Instructions && typeof recipe.Instructions === 'string'
      ? recipe.Instructions
          .split('\n')
          .map((step: string) => step.trim())
          .filter((step: string) => step.length > 0)
      : []

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.Name,
    description: recipe.Notes || `Recipe for ${recipe.Name}`,
    recipeCategory: recipe.Category || undefined,
    image: recipe.Image_url ? [recipe.Image_url] : undefined,
    prepTime: recipe.Prep_time ? `PT${recipe.Prep_time}M` : undefined,
    cookTime: recipe.Cook_time ? `PT${recipe.Cook_time}M` : undefined,
    keywords: recipe.Tags || undefined,
    recipeInstructions:
      instructionSteps.length > 0
        ? instructionSteps.map((step: string) => ({
            '@type': 'HowToStep',
            text: step,
          }))
        : undefined,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const recipe = await getRecipeForSeo(id)

  if (!recipe) {
    return {
      title: 'Recipe not found',
      description: 'This recipe could not be found.',
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

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const recipe = await getRecipeForSeo(id)
  const jsonLd = createRecipeJsonLd(recipe)

  return (
    <>
      {jsonLd && (
        <Script
          id="recipe-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      )}

      <RecipePageClient />
    </>
  )
}