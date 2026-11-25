const publicOrigin = 'https://pedeprosa.netlify.app'
const demoAccounts = {
  autor: { username: 'autor', passwordKey: 'AUTHOR_PASSWORD', role: 'autor', name: 'Ana Luz Ribeiro', authorId: 'ana-luz' },
  revisor: { username: 'revisor', passwordKey: 'REVIEWER_PASSWORD', role: 'revisor', name: 'Bia Sampaio', authorId: 'bia-sampaio' },
  editor: { username: 'editor', passwordKey: 'EDITOR_PASSWORD', role: 'editor', name: 'Caio Nunes', authorId: 'caio-nunes' }
}

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

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
  return btoa(String.fromCharCode(...signature)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sessionFrom(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || !env.DEMO_SECRET) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || await sign(payload, env.DEMO_SECRET) !== signature) return null
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
    alt_text: row.alt_text || `Ilustração editorial sobre ${row.category_name || 'vida brasileira'}`
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
