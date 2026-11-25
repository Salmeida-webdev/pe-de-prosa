import { localStories, localCategories, localAuthors, localTags } from '~/composables/usePortal'

export default defineEventHandler((event) => {
  const origin = 'https://pedeprosa.netlify.app'
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  const urls = [
    `${origin}/`,
    `${origin}/sobre`,
    `${origin}/autores`,
    `${origin}/assuntos`,
    `${origin}/politica-editorial`,
    `${origin}/privacidade`,
    ...localCategories.map(item => `${origin}/categoria/${item.slug}`),
    ...localAuthors.map(item => `${origin}/autor/${item.slug}`),
    ...localTags.filter(item => item.article_count > 0).map(item => `${origin}/tag/${item.slug}`),
    ...localStories.filter(item => item.status === 'published').map(item => `${origin}/artigo/${item.slug}`)
  ]
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(loc => `<url><loc>${loc}</loc></url>`).join('')}</urlset>`
})
