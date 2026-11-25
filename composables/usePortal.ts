import seed from '~/data/seed.json'
import additionalStories from '~/data/additional-stories.json'

type SeedStory = typeof seed.articles[number] | typeof additionalStories[number]
export type Story = Omit<SeedStory, 'cover' | 'alt' | 'status'> & {
  cover?: string; alt?: string; status: string; alt_text?: string
  category_name?: string; category_slug?: string; author_name?: string; author_slug?: string; reading_minutes?: number; published_at?: string
}

const categories = seed.categories
const authors = seed.authors
const tagSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')

export const localStories: Story[] = [...seed.articles, ...additionalStories].map((story) => {
  const category = categories.find(item => item.id === story.category)
  const author = authors.find(item => item.id === story.author)
  const words = story.body.join(' ').trim().split(/\s+/).filter(Boolean).length
  return { ...story, alt_text: String(('alt' in story ? story.alt : '') || `Ilustração editorial sobre ${category?.name || 'vida brasileira'}`), category_name: category?.name, category_slug: category?.slug, author_name: author?.name, author_slug: author?.slug, reading_minutes: Math.max(1, Math.ceil(words / 200)), published_at: story.date }
})

export const localCategories = categories.map(category => ({ ...category, article_count: localStories.filter(story => story.category === category.id && story.status === 'published').length }))
export const localAuthors = authors.map(author => ({ ...author, article_count: localStories.filter(story => story.author === author.id && story.status === 'published').length }))
export const localTags = seed.tags.map(name => ({ name, slug: tagSlug(name), article_count: localStories.filter(story => story.status === 'published' && story.tags.includes(name)).length }))

export async function portalFetch<T>(path: string, fallback: T): Promise<T> {
  const config = useRuntimeConfig()
  try {
    return await $fetch<T>(`${String(config.public.apiBase).replace(/\/$/, '')}${path}`)
  } catch {
    return fallback
  }
}

export function localFeed(input: { q?: string; category?: string; tag?: string; page?: number; pageSize?: number } = {}) {
  const q = (input.q || '').trim().toLocaleLowerCase('pt-BR')
  const requestedPage = Math.max(1, Number(input.page || 1))
  const pageSize = Math.max(1, Number(input.pageSize || 9))
  const rows = localStories.filter((story) => {
    const category = categories.find(item => item.id === story.category)
    const searchText = `${story.title} ${story.excerpt} ${story.body.join(' ')} ${story.author_name} ${category?.name} ${story.tags.join(' ')}`.toLocaleLowerCase('pt-BR')
    return story.status === 'published' && (!input.category || category?.slug === input.category) && (!input.tag || story.tags.some(tag => tagSlug(tag) === input.tag)) && (!q || searchText.includes(q))
  })
  rows.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || String(b.published_at).localeCompare(String(a.published_at)))
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const start = (page - 1) * pageSize
  return { articles: rows.slice(start, start + pageSize), total: rows.length, page, pageSize, totalPages }
}

export function byCategory(slug: string) { return localCategories.find(item => item.slug === slug) }
export function byAuthor(slug: string) { return localAuthors.find(item => item.slug === slug) }
export function byTag(slug: string) { return localTags.find(item => item.slug === slug) }
export function localArticle(slug: string) { return localStories.find(item => item.slug === slug && item.status === 'published') }
