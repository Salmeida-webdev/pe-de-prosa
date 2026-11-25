import { localStories } from '~/composables/usePortal'

const xml = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')

export default defineEventHandler((event) => {
  const origin = 'https://pedeprosa.netlify.app'
  const rows = localStories.filter(story => story.status === 'published').sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,30)
  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600')
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Pé de Prosa</title><link>${origin}</link><description>Histórias, ideias e bons encontros em uma publicação editorial brasileira.</description><language>pt-br</language>${rows.map(story => `<item><title>${xml(story.title)}</title><link>${origin}/artigo/${story.slug}</link><guid isPermaLink="true">${origin}/artigo/${story.slug}</guid><description>${xml(story.excerpt)}</description><pubDate>${new Date(`${story.date}T12:00:00Z`).toUTCString()}</pubDate><author>${xml(story.author_name || '')}</author></item>`).join('')}</channel></rss>`
})
