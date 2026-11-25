import { localStories, localCategories, localAuthors, localTags } from '~/composables/usePortal'

export default defineEventHandler(async (event) => {
  const origin = 'https://pedeprosa.netlify.app'
  const config = useRuntimeConfig(event)
  const apiBase = String(config.public.apiBase).replace(/\/$/, '')
  let categories:any[] = localCategories
  let authors:any[] = localAuthors
  let tags:any[] = localTags
  let articles:any[] = localStories.filter(story => story.status === 'published')
  try {
    const [categoryData, authorData, tagData, firstPage] = await Promise.all([
      $fetch<any>(`${apiBase}/categories`), $fetch<any>(`${apiBase}/authors`), $fetch<any>(`${apiBase}/tags`), $fetch<any>(`${apiBase}/articles?limit=24&page=1`)
    ])
    categories = categoryData.categories || []
    authors = authorData.authors || []
    tags = tagData.tags || []
    articles = [...(firstPage.articles || [])]
    for (let page = 2; page <= Math.min(Number(firstPage.totalPages || 1), 50); page++) {
      const next = await $fetch<any>(`${apiBase}/articles?limit=24&page=${page}`)
      articles.push(...(next.articles || []))
    }
  } catch {}
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
  const urls = [
    `${origin}/`, `${origin}/sobre`, `${origin}/autores`, `${origin}/assuntos`, `${origin}/politica-editorial`, `${origin}/privacidade`,
    ...categories.map(item => `${origin}/categoria/${encodeURIComponent(item.slug)}`),
    ...authors.map(item => `${origin}/autor/${encodeURIComponent(item.slug)}`),
    ...tags.filter(item => item.article_count > 0).map(item => `${origin}/tag/${encodeURIComponent(item.slug)}`),
    ...articles.filter(item => item.status === 'published').map(item => `${origin}/artigo/${encodeURIComponent(item.slug)}`)
  ]
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(loc => `<url><loc>${loc.replaceAll('&','&amp;')}</loc></url>`).join('')}</urlset>`
})
