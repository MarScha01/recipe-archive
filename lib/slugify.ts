// Convert recipe title to URL friendly slug

export function slugify(text: string)
{
	return text
		.toLowerCase()
		.trim()
		.replace(/['"]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}