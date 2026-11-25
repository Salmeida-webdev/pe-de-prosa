import { readFile, writeFile } from 'node:fs/promises'

const data = JSON.parse(await readFile(new URL('../data/seed.json', import.meta.url), 'utf8'))
data.articles.push(...JSON.parse(await readFile(new URL('../data/additional-stories.json', import.meta.url), 'utf8')))
const q = value => `'${String(value ?? '').replaceAll("'", "''")}'`
const slug = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const coverFor = category => ({ cidade:'/images/casas-brasileiras.png', cultura:'/images/livros-leitura.png', cotidiano:'/images/caderno-receitas.png', ideias:'/images/livros-leitura.png', trabalho:'/images/trabalho-entrega.png', natureza:'/images/brand-jabuticaba.png' }[category] || '/images/brand-jabuticaba.png')
const statements = [
  'PRAGMA foreign_keys = ON;',
  'DELETE FROM editorial_events;', 'DELETE FROM article_tags;', 'DELETE FROM articles;', 'DELETE FROM tags;', 'DELETE FROM authors;', 'DELETE FROM categories;'
]
for (const category of data.categories) {
  statements.push(`INSERT INTO categories (id,name,slug,description,color) VALUES (${q(category.id)},${q(category.name)},${q(category.slug)},${q(category.description)},${q(category.color)});`)
}
for (const author of data.authors) {
  statements.push(`INSERT INTO authors (id,name,slug,bio,role,location) VALUES (${q(author.id)},${q(author.name)},${q(author.slug)},${q(author.bio)},${q(author.role)},${q(author.location)});`)
}
for (const name of data.tags) {
  const id = slug(name)
  statements.push(`INSERT INTO tags (id,name,slug) VALUES (${q(id)},${q(name)},${q(id)});`)
}
for (const article of data.articles) {
  const status = article.status || 'published'
  const publishedAt = status === 'published' ? `${article.date}T12:00:00.000Z` : null
  const readingMinutes = Math.max(1, Math.ceil(article.body.join(' ').trim().split(/\s+/).filter(Boolean).length / 200))
  const seoTitle = `${article.title} | Pé de Prosa`
  statements.push(`INSERT INTO articles (id,title,slug,excerpt,body_json,category_id,author_id,cover,alt_text,status,featured,reading_minutes,published_at,updated_at,seo_title,seo_description) VALUES (${q(article.id)},${q(article.title)},${q(article.slug)},${q(article.excerpt)},${q(JSON.stringify(article.body))},${q(article.category)},${q(article.author)},${q(coverFor(article.category))},${q(article.alt || `Ilustração editorial sobre ${article.category}`)},${q(status)},${article.featured ? 1 : 0},${readingMinutes},${publishedAt ? q(publishedAt) : 'NULL'},${q(`${article.date}T12:00:00.000Z`)},${q(seoTitle)},${q(article.excerpt)});`)
  for (const tagName of article.tags) statements.push(`INSERT INTO article_tags (article_id,tag_id) VALUES (${q(article.id)},${q(slug(tagName))});`)
  const action = status === 'published' ? 'Publicado na edição de demonstração' : ({ draft:'Rascunho criado', review:'Enviado para revisão', returned:'Devolvido para revisão do autor', approved:'Aprovado para publicação', archived:'Arquivado pelo editor' }[status] || 'Estado inicial')
  statements.push(`INSERT INTO editorial_events (id,article_id,actor_name,actor_role,action,note,created_at) VALUES (${q(`event-${article.id}`)},${q(article.id)},${q('Equipe Pé de Prosa')},${q(status==='published'?'editor':'autor')},${q(action)},${q('Registro inicial do fluxo editorial de demonstração.')},${q(`${article.date}T12:00:00.000Z`)});`)
}
await writeFile(new URL('../cloudflare/demo-seed.sql', import.meta.url), `${statements.join('\n')}\n`)
console.log(`Gerado seed restaurável: ${data.articles.length} artigos, ${data.authors.length} autores e ${data.categories.length} editorias.`)
