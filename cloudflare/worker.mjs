const publicOrigin = 'https://pedeprosa.netlify.app'
const demoAccounts = {
  autor: { username: 'autor', passwordKey: 'AUTHOR_PASSWORD', role: 'autor', name: 'Ana Luz Ribeiro', authorId: 'ana-luz' },
  revisor: { username: 'revisor', passwordKey: 'REVIEWER_PASSWORD', role: 'revisor', name: 'Bia Sampaio', authorId: 'bia-sampaio' },
  editor: { username: 'editor', passwordKey: 'EDITOR_PASSWORD', role: 'editor', name: 'Caio Nunes', authorId: 'caio-nunes' }
}
const defaultSettings = {
  siteName: 'Pé de Prosa', tagline: 'Jornalismo, cultura e vida brasileira', mastheadTopLine: 'Jornalismo, cultura e vida brasileira',
  footerDescription: 'Reportagens, ensaios e histórias para compreender o Brasil com contexto e curiosidade.', footerSubline: 'Uma publicação editorial independente',
  homepageTitle: 'Histórias para ler com calma', homepageDescription: 'Novos olhares sobre o cotidiano, a cultura e as transformações do país.',
  aboutTitle: 'Uma publicação feita para olhar mais de perto.', aboutDescription: 'Reportagens, ensaios e histórias que ajudam a conectar experiências, ideias e lugares do Brasil.',
  theme: { paper: '#fffefa', ink: '#171a18', accent: '#9d382a', forest: '#263b35' },
  social: { instagram: '', facebook: '', youtube: '' }
}
const defaultPages = [
  { slug: 'sobre', title: 'Sobre a publicação', summary: 'Conheça a linha editorial e a proposta do Pé de Prosa.', sections: [{ heading: 'Contexto antes do ruído.', body: 'O Pé de Prosa é uma publicação editorial brasileira dedicada a histórias, ideias e observações sobre a vida em comum. Escolhemos temas que ajudam a entender o cotidiano, as mudanças nas cidades e as perguntas que atravessam a sociedade.' }, { heading: 'Clareza, contexto e escuta', body: 'Cada texto procura explicar o que está em jogo sem perder a clareza nem a curiosidade. Reportagens, ensaios e opiniões devem ter autoria e abordagem identificadas, com espaço para correções quando necessárias.' }], seo_title: 'Sobre a publicação', seo_description: 'Conheça a proposta editorial do Pé de Prosa.' },
  { slug: 'politica-editorial', title: 'Política editorial', summary: 'Os critérios que orientam seleção, edição e apresentação dos textos.', sections: [{ heading: 'Clareza e contexto', body: 'A edição procura preservar nuances, explicar termos e deixar claro o que é observação, interpretação ou opinião.' }, { heading: 'Autoria identificada', body: 'Os textos devem ter autoria e editoria identificadas. Edição e revisão podem propor ajustes sem apagar a responsabilidade de quem assina.' }, { heading: 'Correções', body: 'Quando um erro é identificado, a correção deve ser feita com rapidez e de forma proporcional. Alterações relevantes precisam explicar o que mudou.' }, { heading: 'Independência e cuidado', body: 'A escolha de pauta considera relevância, respeito às pessoas mencionadas e transparência sobre os limites do texto.' }], seo_title: 'Política editorial', seo_description: 'Critérios editoriais, autoria e correções do Pé de Prosa.' },
  { slug: 'privacidade', title: 'Privacidade', summary: 'Como o portal trata dados de navegação e informações pessoais.', sections: [{ heading: 'Leitura sem cadastro', body: 'O acervo público pode ser consultado sem criar uma conta. O portal não oferece comentários nem publicidade comportamental.' }, { heading: 'Dados técnicos', body: 'Provedores de infraestrutura podem processar registros técnicos para entregar as páginas, prevenir abuso e manter a segurança do serviço.' }, { heading: 'Links externos', body: 'Links para outros sites são destinos externos; as práticas desses serviços são responsabilidade de cada operador.' }], seo_title: 'Privacidade', seo_description: 'Informações sobre privacidade e navegação no Pé de Prosa.' }
]

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
})
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers } })
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100)
const parseJson = (value, fallback = []) => { try { return JSON.parse(value || 'null') ?? fallback } catch { return fallback } }
const cleanText = (value, max = 500) => String(value || '').trim().slice(0, max)
const safeSlug = (value) => slugify(String(value || '')).slice(0, 80)
const safeHttpsUrl = (value) => { const raw = cleanText(value, 500); if (!raw) return ''; try { const url = new URL(raw); return url.protocol === 'https:' ? url.toString() : '' } catch { return '' } }
const isValidStatus = (value) => ['draft','review','returned','approved','published','unpublished','archived'].includes(value)

async function settingsFrom(db) {
  const row = await db.prepare("SELECT settings_json FROM site_settings WHERE id='portal'").first()
  return { ...defaultSettings, ...parseJson(row?.settings_json, {}), theme: { ...defaultSettings.theme, ...(parseJson(row?.settings_json, {}).theme || {}) }, social: { ...defaultSettings.social, ...(parseJson(row?.settings_json, {}).social || {}) } }
}

async function pagesFrom(db) {
  const result = await db.prepare('SELECT slug,title,summary,sections_json,seo_title,seo_description,updated_at FROM portal_pages ORDER BY title').all()
  const edited = new Map((result.results || []).map(row => [row.slug, { ...row, sections: parseJson(row.sections_json, []) }]))
  return defaultPages.map(page => edited.get(page.slug) || page)
}

async function saveTags(db, articleId, tags) {
  await db.prepare('DELETE FROM article_tags WHERE article_id=?').bind(articleId).run()
  for (const tagName of [...new Set((Array.isArray(tags) ? tags : []).map(value => cleanText(value, 40)).filter(Boolean))].slice(0, 12)) {
    const tagId = safeSlug(tagName)
    if (!tagId) continue
    await db.prepare('INSERT OR IGNORE INTO tags (id,name,slug) VALUES (?,?,?)').bind(tagId, tagName, tagId).run()
    await db.prepare('INSERT OR IGNORE INTO article_tags (article_id,tag_id) VALUES (?,?)').bind(articleId, tagId).run()
  }
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
  return btoa(String.fromCharCode(...signature)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function constantTimeEqual(left, right) {
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all([left, right].map(value => crypto.subtle.digest('SHA-256', encoder.encode(String(value || '')))))
  const x = new Uint8Array(a); const y = new Uint8Array(b)
  let mismatch = 0
  for (let i = 0; i < x.length; i++) mismatch |= x[i] ^ y[i]
  return mismatch === 0
}

async function sessionFrom(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || !env.DEMO_SECRET) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !await constantTimeEqual(await sign(payload, env.DEMO_SECRET), signature)) return null
  try {
    const encoded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const session = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
    return session.exp > Date.now() ? session : null
  } catch { return null }
}

async function tagsFor(db, articleId) {
  const { results = [] } = await db.prepare('SELECT t.name, t.slug FROM tags t JOIN article_tags at ON at.tag_id=t.id WHERE at.article_id=? ORDER BY t.name').bind(articleId).all()
  return results.map(tag => tag.name)
}

async function storyFromRow(db, row) {
  return {
    ...row,
    category: row.category_id,
    author: row.author_id,
    body: parseJson(row.body_json),
    tags: await tagsFor(db, row.id),
    featured: Boolean(row.featured),
    reading_minutes: row.reading_minutes,
    author_bio: row.author_bio || '',
    author_role: row.author_role || 'Repórter',
    author_location: row.author_location || 'Brasil',
    alt_text: row.alt_text || `Fotografia editorial relacionada à matéria: ${row.title}`
  }
}

async function createEvent(db, articleId, session, action, note = '') {
  await db.prepare('INSERT INTO editorial_events (id, article_id, actor_name, actor_role, action, note) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), articleId, session.name, session.role, action, note).run()
}

const storySelect = `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
  au.name AS author_name, au.slug AS author_slug, au.bio AS author_bio,
  au.role AS author_role, au.location AS author_location
  FROM articles a JOIN categories c ON c.id=a.category_id JOIN authors au ON au.id=a.author_id`

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowed = new Set([publicOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'])
    const cors = allowed.has(origin) ? corsHeaders(origin) : {}
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)
    if (!env.DB) return json({ error: 'Database binding is missing' }, 503, cors)
    const db = env.DB
    const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
    const cache = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', ...cors }

    try {
      if (parts[0] === 'health') {
        const row = await db.prepare("SELECT COUNT(*) AS total FROM articles WHERE status='published'").first()
        return json({ ok: true, publishedArticles: row?.total || 0 }, 200, { 'Cache-Control': 'no-store', ...cors })
      }

      if (parts[0] === 'site' && parts.length === 1 && request.method === 'GET') return json(await settingsFrom(db), 200, cache)
      if (parts[0] === 'pages' && parts.length === 2 && request.method === 'GET') {
        const pages = await pagesFrom(db)
        const page = pages.find(item => item.slug === parts[1])
        return page ? json(page, 200, cache) : json({ error: 'Not found' }, 404, cache)
      }

      if (parts[0] === 'admin') {
        if (env.ADMIN_ENABLED !== 'true' || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.DEMO_SECRET) return json({ error: 'Not found' }, 404, cors)
        if (parts[1] === 'login' && request.method === 'POST') {
          const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
          const ipHash = await sign(ip, env.DEMO_SECRET)
          const now = Date.now()
          const attemptCount = await db.prepare('SELECT COUNT(*) AS total FROM admin_login_attempts WHERE ip_hash=? AND attempted_at>?').bind(ipHash, now - 15 * 60 * 1000).first()
          if (Number(attemptCount?.total || 0) >= 8) return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, 429, { 'Cache-Control': 'no-store', ...cors })
          let body = {}
          try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400, cors) }
          const validUser = await constantTimeEqual(body.username, env.ADMIN_USERNAME)
          const validPassword = await constantTimeEqual(body.password, env.ADMIN_PASSWORD)
          if (!validUser || !validPassword) {
            await db.prepare('INSERT INTO admin_login_attempts (ip_hash,attempted_at) VALUES (?,?)').bind(ipHash, now).run()
            return json({ error: 'Usuário ou senha inválidos.' }, 401, { 'Cache-Control': 'no-store', ...cors })
          }
          await db.prepare('DELETE FROM admin_login_attempts WHERE ip_hash=?').bind(ipHash).run()
          const session = { username: cleanText(env.ADMIN_USERNAME, 120), role: 'admin', name: cleanText(env.ADMIN_DISPLAY_NAME || 'Administrador', 120), exp: now + 1000 * 60 * 60 * 8 }
          const payload = btoa(JSON.stringify(session)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
          return json({ token: `${payload}.${await sign(payload, env.DEMO_SECRET)}`, name: session.name, role: session.role, exp: session.exp }, 200, { 'Cache-Control': 'no-store', ...cors })
        }

        const session = await sessionFrom(request, env)
        if (!session || session.role !== 'admin') return json({ error: 'Unauthorized' }, 401, { 'Cache-Control': 'no-store', ...cors })
        const noStore = { 'Cache-Control': 'no-store', ...cors }
        if (parts[1] === 'logout') return json({ ok: true }, 200, noStore)
        if (parts[1] === 'dashboard' && request.method === 'GET') {
          const counts = await db.prepare("SELECT status,COUNT(*) AS total FROM articles GROUP BY status").all()
          const recent = await db.prepare(`${storySelect} ORDER BY a.updated_at DESC LIMIT 8`).all()
          return json({ counts: counts.results || [], recent: await Promise.all((recent.results || []).map(row => storyFromRow(db, row))) }, 200, noStore)
        }
        if (parts[1] === 'settings' && parts.length === 2) {
          if (request.method === 'GET') return json(await settingsFrom(db), 200, noStore)
          let body = {}; try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400, cors) }
          const data = { ...defaultSettings, ...body, theme: { ...defaultSettings.theme, ...(body.theme || {}) }, social: { ...defaultSettings.social, ...(body.social || {}) } }
          for (const key of ['siteName','tagline','mastheadTopLine','footerDescription','footerSubline','homepageTitle','homepageDescription','aboutTitle','aboutDescription']) data[key] = cleanText(data[key], 240)
          for (const key of ['paper','ink','accent','forest']) if (!/^#[0-9a-f]{6}$/i.test(data.theme[key])) data.theme[key] = defaultSettings.theme[key]
          for (const key of ['instagram','facebook','youtube']) data.social[key] = safeHttpsUrl(data.social[key])
          await db.prepare("INSERT INTO site_settings (id,settings_json,updated_at) VALUES ('portal',?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET settings_json=excluded.settings_json,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(data)).run()
          return json({ ok: true, settings: data }, 200, noStore)
        }
        if (parts[1] === 'pages' && parts.length === 2) {
          if (request.method === 'GET') return json({ pages: await pagesFrom(db) }, 200, noStore)
          let body = {}; try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400, cors) }
          const slug = safeSlug(body.slug)
          if (!['sobre','politica-editorial','privacidade'].includes(slug)) return json({ error: 'Página não permitida.' }, 400, cors)
          const title = cleanText(body.title, 160); const summary = cleanText(body.summary, 400)
          const sections = (Array.isArray(body.sections) ? body.sections : []).slice(0, 20).map(item => ({ heading: cleanText(item.heading, 160), body: cleanText(item.body, 4000) })).filter(item => item.heading || item.body)
          await db.prepare('INSERT INTO portal_pages (slug,title,summary,sections_json,seo_title,seo_description,updated_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,sections_json=excluded.sections_json,seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=CURRENT_TIMESTAMP').bind(slug,title,summary,JSON.stringify(sections),cleanText(body.seo_title || title, 160),cleanText(body.seo_description || summary, 300)).run()
          return json({ ok: true }, 200, noStore)
        }
        if (parts[1] === 'categories' && parts.length === 2) {
          if (request.method === 'GET') { const result = await db.prepare('SELECT c.*,COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON a.category_id=c.id AND a.status=\'published\' GROUP BY c.id ORDER BY c.name').all(); return json({ categories: result.results || [] }, 200, noStore) }
          let body = {}; try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400, cors) }
          const name = cleanText(body.name, 80); const slug = safeSlug(body.slug || name); const id = cleanText(body.id || slug, 80)
          if (name.length < 2 || !slug || !id) return json({ error: 'Informe nome e endereço da editoria.' }, 400, cors)
          await db.prepare('INSERT INTO categories (id,name,slug,description,color) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,description=excluded.description,color=excluded.color').bind(id,name,slug,cleanText(body.description, 300),cleanText(body.color || 'forest', 30)).run()
          return json({ ok: true }, 200, noStore)
        }
        if (parts[1] === 'authors' && parts.length === 2) {
          if (request.method === 'GET') { const result = await db.prepare('SELECT au.*,COUNT(a.id) AS article_count FROM authors au LEFT JOIN articles a ON a.author_id=au.id AND a.status=\'published\' GROUP BY au.id ORDER BY au.name').all(); return json({ authors: result.results || [] }, 200, noStore) }
          let body = {}; try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400, cors) }
          const name = cleanText(body.name, 100); const slug = safeSlug(body.slug || name); const id = cleanText(body.id || slug, 80)
          if (name.length < 2 || !slug || !id) return json({ error: 'Informe nome e endereço do perfil.' }, 400, cors)
          await db.prepare('INSERT INTO authors (id,name,slug,bio,role,location,avatar) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,bio=excluded.bio,role=excluded.role,location=excluded.location,avatar=excluded.avatar').bind(id,name,slug,cleanText(body.bio, 800),cleanText(body.role || 'Colunista', 80),cleanText(body.location || 'Brasil', 100),safeHttpsUrl(body.avatar)).run()
          return json({ ok: true }, 200, noStore)
        }
        if (parts[1] === 'articles' && parts.length <= 3) {
          if (request.method === 'GET') { const result = await db.prepare(`${storySelect} ORDER BY a.updated_at DESC`).all(); return json({ articles: await Promise.all((result.results || []).map(row => storyFromRow(db, row))) }, 200, noStore) }
          let body = {}; try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400, cors) }
          const id = parts[2] || cleanText(body.id, 80) || crypto.randomUUID()
          const current = await db.prepare('SELECT * FROM articles WHERE id=?').bind(id).first()
          const title = cleanText(body.title, 160); const excerpt = cleanText(body.excerpt, 500)
          const paragraphSource = Array.isArray(body.body) ? body.body : String(body.body || '').split(/\n\s*\n/)
          const paragraphs = paragraphSource.map(value => cleanText(value, 6000)).filter(Boolean).slice(0, 80)
          const category = cleanText(body.category_id || body.category, 80); const author = cleanText(body.author_id || body.author, 80)
          const status = isValidStatus(body.status) ? body.status : (current?.status || 'draft')
          if (title.length < 8 || excerpt.length < 20 || paragraphs.length < 1) return json({ error: 'Preencha título, resumo e texto.' }, 400, cors)
          if (!await db.prepare('SELECT id FROM categories WHERE id=?').bind(category).first()) return json({ error: 'Editoria inválida.' }, 400, cors)
          if (!await db.prepare('SELECT id FROM authors WHERE id=?').bind(author).first()) return json({ error: 'Autoria inválida.' }, 400, cors)
          let slug = safeSlug(body.slug || current?.slug || title)
          if (!slug) slug = crypto.randomUUID().slice(0, 8)
          const conflict = await db.prepare('SELECT id FROM articles WHERE slug=? AND id<>?').bind(slug,id).first()
          if (conflict) slug = `${slug}-${id.slice(0, 6)}`
          const rawCover = cleanText(body.cover, 500)
          const cover = safeHttpsUrl(rawCover) || (rawCover.startsWith('/uploads/') && !rawCover.includes('..') ? rawCover : '')
          const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',')
          const tagNames = tags.map(tag => cleanText(typeof tag === 'string' ? tag : tag.name, 40)).filter(Boolean).slice(0, 12)
          const publishedAt = status === 'published' ? cleanText(body.published_at || current?.published_at || new Date().toISOString(), 40) : (body.published_at || current?.published_at || null)
          const readingMinutes = Math.max(1, Math.ceil(paragraphs.join(' ').split(/\s+/).filter(Boolean).length / 200))
          const values = [title,slug,excerpt,JSON.stringify(paragraphs),category,author,cover,cleanText(body.alt_text, 300),status,body.featured ? 1 : 0,readingMinutes,publishedAt,cleanText(body.seo_title || title, 160),cleanText(body.seo_description || excerpt, 300),id]
          if (current) {
            await db.prepare('UPDATE articles SET title=?,slug=?,excerpt=?,body_json=?,category_id=?,author_id=?,cover=?,alt_text=?,status=?,featured=?,reading_minutes=?,published_at=?,updated_at=CURRENT_TIMESTAMP,seo_title=?,seo_description=? WHERE id=?').bind(...values).run()
          } else {
            await db.prepare('INSERT INTO articles (title,slug,excerpt,body_json,category_id,author_id,cover,alt_text,status,featured,reading_minutes,published_at,updated_at,seo_title,seo_description,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?,?)').bind(...values).run()
          }
          await saveTags(db,id,tagNames)
          await createEvent(db,id,session,current ? 'Publicação atualizada pelo administrador' : 'Publicação criada pelo administrador',status === 'published' ? 'Alteração publicada.' : 'Alteração salva como rascunho.')
          return json({ ok: true, id, slug, status }, current ? 200 : 201, noStore)
        }
        return json({ error: 'Not found' }, 404, cors)
      }

      if (parts[0] === 'editor') {
        if (env.EDITORIAL_DEMO !== 'true') return json({ error: 'Not found' }, 404, cors)
        if (parts[1] === 'login' && request.method === 'POST') {
          const body = await request.json()
          const account = demoAccounts[String(body.username || '')]
          if (!account || !env[account.passwordKey] || body.password !== env[account.passwordKey]) return json({ error: 'Invalid credentials' }, 401, cors)
          const payload = btoa(JSON.stringify({ username: account.username, role: account.role, name: account.name, authorId: account.authorId, exp: Date.now() + 1000 * 60 * 60 * 8 })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
          return json({ token: `${payload}.${await sign(payload, env.DEMO_SECRET)}`, name: account.name, role: account.role, authorId: account.authorId }, 200, { 'Cache-Control': 'no-store', ...cors })
        }
        const session = await sessionFrom(request, env)
        if (!session) return json({ error: 'Unauthorized' }, 401, { 'Cache-Control': 'no-store', ...cors })
        if (parts[1] === 'logout') return json({ ok: true }, 200, { 'Cache-Control': 'no-store', ...cors })
        if (parts[1] === 'articles' && request.method === 'GET' && parts.length === 2) {
          const result = session.role === 'autor'
            ? await db.prepare(`${storySelect} WHERE a.author_id=? ORDER BY CASE a.status WHEN 'review' THEN 1 WHEN 'returned' THEN 2 WHEN 'approved' THEN 3 WHEN 'draft' THEN 4 WHEN 'published' THEN 5 ELSE 6 END, a.updated_at DESC`).bind(session.authorId).all()
            : await db.prepare(`${storySelect} ORDER BY CASE a.status WHEN 'review' THEN 1 WHEN 'returned' THEN 2 WHEN 'approved' THEN 3 WHEN 'draft' THEN 4 WHEN 'published' THEN 5 ELSE 6 END, a.updated_at DESC`).all()
          const articles = await Promise.all((result.results || []).map(row => storyFromRow(db, row)))
          for (const article of articles) {
            const events = await db.prepare('SELECT actor_name, actor_role, action, note, created_at FROM editorial_events WHERE article_id=? ORDER BY created_at DESC LIMIT 8').bind(article.id).all()
            article.events = events.results || []
          }
          return json({ articles }, 200, { 'Cache-Control': 'no-store', ...cors })
        }
        if (parts[1] === 'articles' && parts.length === 2 && request.method === 'POST') {
          if (session.role !== 'autor') return json({ error: 'Forbidden' }, 403, cors)
          const body = await request.json()
          const title = String(body.title || '').trim().slice(0, 140)
          const excerpt = String(body.excerpt || '').trim().slice(0, 300)
          const paragraphs = String(body.body || '').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean).slice(0, 50)
          if (title.length < 8 || excerpt.length < 30 || !paragraphs.length) return json({ error: 'Preencha título, resumo e texto.' }, 400, cors)
          const categoryId = ['cidade','cultura','cotidiano','ideias','trabalho','natureza'].includes(body.category) ? body.category : 'cidade'
          const id = crypto.randomUUID(); const slug = `${slugify(title)}-${id.slice(0, 6)}`
          await db.prepare("INSERT INTO articles (id,title,slug,excerpt,body_json,category_id,author_id,status,featured,reading_minutes,published_at,updated_at,seo_title,seo_description) VALUES (?,?,?,?,?,?,?,'draft',0,4,NULL,CURRENT_TIMESTAMP,?,?)")
            .bind(id,title,slug,excerpt,JSON.stringify(paragraphs),categoryId,session.authorId,title,excerpt).run()
          await createEvent(db,id,session,'Rascunho criado','Primeira versão salva na redação.')
          return json({ ok: true, id }, 201, { 'Cache-Control': 'no-store', ...cors })
        }
        if (parts[1] === 'articles' && parts.length === 4 && parts[3] === 'edit' && request.method === 'POST') {
          if (session.role !== 'autor') return json({ error: 'Forbidden' }, 403, cors)
          const articleId = parts[2]
          const body = await request.json()
          const current = await db.prepare('SELECT id,status,author_id FROM articles WHERE id=?').bind(articleId).first()
          if (!current || current.author_id !== session.authorId || !['draft','returned'].includes(current.status)) return json({ error: 'This draft cannot be edited by this account' }, 403, cors)
          const title = String(body.title || '').trim().slice(0, 140)
          const excerpt = String(body.excerpt || '').trim().slice(0, 300)
          const paragraphs = String(body.body || '').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean).slice(0, 50)
          if (title.length < 8 || excerpt.length < 30 || !paragraphs.length) return json({ error: 'Preencha título, resumo e texto.' }, 400, cors)
          const categoryId = ['cidade','cultura','cotidiano','ideias','trabalho','natureza'].includes(body.category) ? body.category : 'cidade'
          await db.prepare('UPDATE articles SET title=?,excerpt=?,body_json=?,category_id=?,seo_title=?,seo_description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(title,excerpt,JSON.stringify(paragraphs),categoryId,title,excerpt,articleId).run()
          await createEvent(db,articleId,session,'Rascunho atualizado','O autor salvou uma nova versão do texto.')
          return json({ ok: true }, 200, { 'Cache-Control': 'no-store', ...cors })
        }
        if (parts[1] === 'articles' && parts.length === 4 && request.method === 'POST') {
          const articleId = parts[2]; const action = parts[3]
          const article = await db.prepare('SELECT id,status,author_id FROM articles WHERE id=?').bind(articleId).first()
          if (!article) return json({ error: 'Article not found' }, 404, cors)
          const body = request.headers.get('Content-Type')?.includes('application/json') ? await request.json() : {}
          let next = null
          if (action === 'submit' && session.role === 'autor' && article.author_id === session.authorId && ['draft','returned'].includes(article.status)) next = 'review'
          if (action === 'review' && session.role === 'revisor' && article.status === 'review' && ['approved','returned'].includes(body.result)) next = body.result
          if (action === 'publish' && session.role === 'editor' && ['approved','unpublished'].includes(article.status)) next = 'published'
          if (action === 'unpublish' && session.role === 'editor' && article.status === 'published') next = 'unpublished'
          if (action === 'archive' && session.role === 'editor' && ['published','unpublished'].includes(article.status)) next = 'archived'
          if (!next) return json({ error: 'Transition is not allowed for this role or status' }, 403, cors)
          await db.prepare('UPDATE articles SET status=?, published_at=CASE WHEN ?=\'published\' THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(next,next,articleId).run()
          const labels = { review:'Enviado para revisão', approved:'Aprovado', returned:'Devolvido ao autor', published:'Publicado', unpublished:'Retirado do ar', archived:'Arquivado' }
          await createEvent(db,articleId,session,labels[next],String(body.note || ''))
          return json({ ok: true, status: next }, 200, { 'Cache-Control': 'no-store', ...cors })
        }
        return json({ error: 'Not found' }, 404, cors)
      }

      if (request.method !== 'GET') return json({ error: 'Read-only endpoint' }, 405, cors)
      if (parts[0] === 'articles' && parts.length === 1) {
        const q = String(url.searchParams.get('q') || '').trim().slice(0, 120)
        const category = url.searchParams.get('category')
        const tag = url.searchParams.get('tag')
        const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
        const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '9', 10)
        const requestedCurrentPage = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1
        const limit = Number.isFinite(requestedLimit) ? Math.min(24, Math.max(1, requestedLimit)) : 9
        const where = ["a.status='published'"]; const params = []
        if (category) { where.push('c.slug=?'); params.push(category) }
        if (tag) { where.push('EXISTS (SELECT 1 FROM article_tags at JOIN tags t ON t.id=at.tag_id WHERE at.article_id=a.id AND t.slug=?)'); params.push(tag) }
        if (q) { where.push('(a.title LIKE ? OR a.excerpt LIKE ? OR a.body_json LIKE ? OR au.name LIKE ? OR c.name LIKE ? OR EXISTS (SELECT 1 FROM article_tags aq JOIN tags tq ON tq.id=aq.tag_id WHERE aq.article_id=a.id AND tq.name LIKE ?))'); const term=`%${q}%`; params.push(term,term,term,term,term,term) }
        const clause = `WHERE ${where.join(' AND ')}`
        const totalRow = await db.prepare(`SELECT COUNT(*) AS total FROM articles a JOIN categories c ON c.id=a.category_id JOIN authors au ON au.id=a.author_id ${clause}`).bind(...params).first()
        const total = Number(totalRow?.total || 0)
        const totalPages = Math.max(1, Math.ceil(total / limit))
        const page = Math.min(requestedCurrentPage, totalPages)
        const result = await db.prepare(`${storySelect} ${clause} ORDER BY a.featured DESC, a.published_at DESC LIMIT ? OFFSET ?`).bind(...params,limit,(page-1)*limit).all()
        const articles = await Promise.all((result.results || []).map(row => storyFromRow(db,row)))
        return json({ articles,total,page,pageSize:limit,totalPages },200,cache)
      }
      if (parts[0] === 'articles' && parts.length === 2) {
        const row=await db.prepare(`${storySelect} WHERE a.slug=? AND a.status='published' LIMIT 1`).bind(parts[1]).first()
        if(!row)return json({error:'Not found'},404,cache)
        return json(await storyFromRow(db,row),200,cache)
      }
      if (parts[0] === 'categories' && parts.length === 1) {
        const result=await db.prepare("SELECT c.*,COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON a.category_id=c.id AND a.status='published' GROUP BY c.id ORDER BY c.name").all()
        return json({categories:result.results||[]},200,cache)
      }
      if (parts[0] === 'categories' && parts.length === 2) {
        const category=await db.prepare('SELECT * FROM categories WHERE slug=?').bind(parts[1]).first()
        return category?json(category,200,cache):json({error:'Not found'},404,cache)
      }
      if (parts[0] === 'authors' && parts.length === 1) {
        const result=await db.prepare("SELECT au.*,COUNT(a.id) AS article_count FROM authors au LEFT JOIN articles a ON a.author_id=au.id AND a.status='published' GROUP BY au.id ORDER BY au.name").all()
        return json({authors:result.results||[]},200,cache)
      }
      if (parts[0] === 'authors' && parts.length === 2) {
        const author=await db.prepare('SELECT * FROM authors WHERE slug=?').bind(parts[1]).first()
        return author?json(author,200,cache):json({error:'Not found'},404,cache)
      }
      if (parts[0] === 'authors' && parts.length === 3 && parts[2] === 'articles') {
        const result=await db.prepare(`${storySelect} WHERE au.slug=? AND a.status='published' ORDER BY a.published_at DESC LIMIT 24`).bind(parts[1]).all()
        const articles=await Promise.all((result.results||[]).map(row=>storyFromRow(db,row)))
        return json({articles,total:articles.length},200,cache)
      }
      if (parts[0] === 'tags' && parts.length === 1) {
        const result=await db.prepare("SELECT t.*,COUNT(a.id) AS article_count FROM tags t LEFT JOIN article_tags at ON at.tag_id=t.id LEFT JOIN articles a ON a.id=at.article_id AND a.status='published' GROUP BY t.id ORDER BY t.name").all()
        return json({tags:result.results||[]},200,cache)
      }
      if (parts[0] === 'tags' && parts.length === 2) {
        const tag=await db.prepare('SELECT t.*,COUNT(a.id) AS article_count FROM tags t LEFT JOIN article_tags at ON at.tag_id=t.id LEFT JOIN articles a ON a.id=at.article_id AND a.status=\'published\' WHERE t.slug=? GROUP BY t.id').bind(parts[1]).first()
        return tag?json(tag,200,cache):json({error:'Not found'},404,cache)
      }
      return json({error:'Not found'},404,cors)
    } catch (error) {
      return json({ error: 'Internal server error' },500,{ 'Cache-Control':'no-store', ...cors })
    }
  }
}
