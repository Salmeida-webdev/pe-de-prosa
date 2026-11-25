import { localStories } from '~/composables/usePortal'

const xml = (value: unknown) => String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')

export default defineEventHandler(async (event) => {
  const origin = 'https://pedeprosa.netlify.app'
  const config = useRuntimeConfig(event)
  const apiBase = String(config.public.apiBase).replace(/\/$/, '')
  let rows = localStories.filter(story => story.status === 'published')
  try {
    const first = await $fetch<any>(`${apiBase}/articles?limit=24&page=1`)
    rows = [...(first.articles || [])]
    for (let page = 2; page <= Math.min(Number(first.totalPages || 1), 50); page++) {
      const next = await $fetch<any>(`${apiBase}/articles?limit=24&page=${page}`)
      rows.push(...(next.articles || []))
    }
  } catch {}
  rows.sort((a:any,b:any) => String(b.published_at || b.date).localeCompare(String(a.published_at || a.date)))
  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Pé de Prosa</title><link>${origin}</link><description>Jornalismo, cultura e vida brasileira.</description><language>pt-br</language>${rows.slice(0,50).map((story:any) => { const date = story.published_at || story.date; return `<item><title>${xml(story.title)}</title><link>${origin}/artigo/${xml(story.slug)}</link><guid isPermaLink="true">${origin}/artigo/${xml(story.slug)}</guid><description>${xml(story.excerpt)}</description><pubDate>${new Date(`${String(date).slice(0,10)}T12:00:00Z`).toUTCString()}</pubDate><author>${xml(story.author_name || '')}</author></item>` }).join('')}</channel></rss>`
})
