import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import RecipePageClient from './RecipePageClient'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type Recipe = {
  id: number
  Name: string
  Category: string | null
  Prep_time: number | null
  Cook_time: number | null
  Notes: string | null
  Image_url: string | null
  Tags: string | null
  Instructions: string | null
  is_public: boolean | null
  user_id: string | null
}

type IngredientRow = {
  Amount: string | null
  Unit: string | null
  IngredientName: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Extract numeric ID from slug (e.g. "43-gypsy-sauce" → 43)
function getRecipeIdFromParam(rawId: string) {
  const idPart = rawId.split('-')[0]
  const recipeId = Number(idPart)

  if (!recipeId || Number.isNaN(recipeId)) {
    return null
  }

  return recipeId
}

async function getRecipePageData(rawId: string) {
  const recipeId = getRecipeIdFromParam(rawId)

  if (!recipeId) return null

  const { data: recipe } = await supabase
    .from('Recipes')
    .select('id, Name, Category, Prep_time, Cook_time, Notes, Image_url, Tags, Instructions, is_public, user_id')
    .eq('id', recipeId)
    .maybeSingle()

  // Only public recipes should be server-rendered/indexed/shared
  if (!recipe || recipe.is_public !== true) {
    return null
  }

  let creatorName = ''

  if (recipe.user_id) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', recipe.user_id)
      .maybeSingle()

    if (profileData) {
      creatorName = profileData.display_name || profileData.username || ''
    }
  }

  const { data: ingredientsData } = await supabase
    .from('Recipe_ingredients')
    .select('*')
    .eq('Recipe_id', recipeId)

  let ingredients: IngredientRow[] = []

  if (ingredientsData && ingredientsData.length > 0) {
    const ingredientIds = ingredientsData.map((item) => item.Ingredient_id)

    const { data: ingredientNames } = await supabase
      .from('Ingredients')
      .select('id, Name')
      .in('id', ingredientIds)

    ingredients = ingredientsData.map((item) => {
      const matchingIngredient = ingredientNames?.find(
        (ingredient) => String(ingredient.id) === String(item.Ingredient_id)
      )

      return {
        Amount: item.Amount,
        Unit: item.Unit,
        IngredientName: matchingIngredient ? matchingIngredient.Name : 'Unknown ingredient',
      }
    })
  }

  return {
    recipe: recipe as Recipe,
    ingredients,
    creatorName,
  }
}

// Build structured data (JSON-LD for Google)
function createRecipeJsonLd(recipe: Recipe) {
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
  const data = await getRecipePageData(id)

  if (!data) {
    return {
      title: 'Recipe not found',
      description: 'This recipe could not be found.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const { recipe } = data

  const descriptionParts = [
    recipe.Category ? `Category: ${recipe.Category}` : null,
    recipe.Prep_time ? `Prep time: ${recipe.Prep_time} min` : null,
    recipe.Cook_time ? `Cook time: ${recipe.Cook_time} min` : null,
  ].filter(Boolean)

  const description =
    descriptionParts.length > 0
      ? `${recipe.Name}. ${descriptionParts.join('. ')}.`
      : `Learn how to make ${recipe.Name}.`

  const pageUrl = `https://my-recipe-archives.vercel.app/recipe/${id}`

  return {
    title: `${recipe.Name} - Recipe Archive`,
    description,
    openGraph: {
      title: recipe.Name,
      description,
      type: 'article',
      url: pageUrl,
      siteName: 'Recipe Archive',
      images: recipe.Image_url
        ? [
            {
              url: recipe.Image_url,
              alt: recipe.Name,
            },
          ]
        : [],
    },
    twitter: {
      card: recipe.Image_url ? 'summary_large_image' : 'summary',
      title: recipe.Name,
      description,
      images: recipe.Image_url ? [recipe.Image_url] : [],
    },
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const data = await getRecipePageData(id)

  if (!data) {
    notFound()
  }

  const jsonLd = createRecipeJsonLd(data.recipe)

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      )}

      <RecipePageClient
        recipe={data.recipe}
        ingredients={data.ingredients}
        creatorName={data.creatorName}
        canEditInitial={false}
      />
    </>
  )
}