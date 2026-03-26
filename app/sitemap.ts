import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const siteUrl = 'https://my-recipe-archives.vercel.app'

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default async function sitemap() {
  const { data: recipes, error } = await supabase
    .from('Recipes')
    .select('id, Name, is_public')

  if (error || !recipes) {
    return [
      {
        url: siteUrl,
        lastModified: new Date(),
      },
      {
        url: `${siteUrl}/find`,
        lastModified: new Date(),
      },
    ]
  }

  const publicRecipeUrls = recipes
    .filter((recipe) => recipe.is_public === true)
    .map((recipe) => ({
      url: `${siteUrl}/recipe/${recipe.id}-${slugifyName(recipe.Name)}`,
      lastModified: new Date(),
    }))

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/find`,
      lastModified: new Date(),
    },
    ...publicRecipeUrls,
  ]
}