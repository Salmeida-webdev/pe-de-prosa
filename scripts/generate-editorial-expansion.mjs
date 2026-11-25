import { readFile, writeFile } from 'node:fs/promises'

const stories = JSON.parse(await readFile(new URL('../data/additional-stories.json', import.meta.url), 'utf8'))
const added = stories.filter(story => Number(story.id.slice(1)) >= 43)
const quote = value => `'${String(value ?? '').replaceAll("'", "''")}'`
const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const statements = ['PRAGMA foreign_keys = ON;', '-- Expansão editorial do Pé de Prosa: textos novos e correção dos textos alternativos herdados.']

statements.push("UPDATE articles SET alt_text = 'Fotografia editorial relacionada à matéria: ' || title WHERE alt_text LIKE 'Ilustração editorial%';")

for (const story of added) {
  const minutes = Math.max(1, Math.ceil(story.body.join(' ').trim().split(/\s+/).length / 200))
  const publishedAt = `${story.date}T12:00:00.000Z`
  const seoTitle = `${story.title} | Pé de Prosa`
  statements.push(`INSERT OR IGNORE INTO articles (id,title,slug,excerpt,body_json,category_id,author_id,cover,alt_text,status,featured,reading_minutes,published_at,updated_at,seo_title,seo_description) VALUES (${quote(story.id)},${quote(story.title)},${quote(story.slug)},${quote(story.excerpt)},${quote(JSON.stringify(story.body))},${quote(story.category)},${quote(story.author)},'',${quote(`Fotografia editorial relacionada à matéria: ${story.title}`)},'published',0,${minutes},${quote(publishedAt)},${quote(publishedAt)},${quote(seoTitle)},${quote(story.excerpt)});`)
  for (const name of story.tags) {
    const id = slugify(name)
    statements.push(`INSERT OR IGNORE INTO tags (id,name,slug) VALUES (${quote(id)},${quote(name)},${quote(id)});`)
    statements.push(`INSERT OR IGNORE INTO article_tags (article_id,tag_id) VALUES (${quote(story.id)},${quote(id)});`)
  }
  statements.push(`INSERT OR IGNORE INTO editorial_events (id,article_id,actor_name,actor_role,action,note,created_at) VALUES (${quote(`event-${story.id}`)},${quote(story.id)},'Equipe Pé de Prosa','editor','Publicado na edição editorial','Texto editorial incorporado ao acervo ampliado.',${quote(publishedAt)});`)
}

await writeFile(new URL('../cloudflare/migrations/0003_editorial_expansion.sql', import.meta.url), `${statements.join('\n')}\n`)
console.log(`Migration editorial gerada com ${added.length} artigos.`)
