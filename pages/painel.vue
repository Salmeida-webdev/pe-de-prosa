<script setup lang="ts">
import { defaultPortalPages, defaultSiteSettings } from '~/composables/usePortal'

type RecordItem = Record<string, any>
type AdminSession = { token: string; name: string; exp: number }
const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase).replace(/\/$/, '')
const activeTab = ref('overview')
const loginForm = reactive({ username: '', password: '' })
const session = ref<AdminSession | null>(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const dashboard = ref<{ counts: Array<{ status:string; total:number }>; recent:RecordItem[] }>({ counts: [], recent: [] })
const articles = ref<RecordItem[]>([])
const categories = ref<RecordItem[]>([])
const authors = ref<RecordItem[]>([])
const pages = ref<RecordItem[]>([])
const settings = reactive(JSON.parse(JSON.stringify(defaultSiteSettings)))
const search = ref('')
const statusFilter = ref('all')
const articleEditing = ref<string | null>(null)
const articleForm = reactive({ title:'', slug:'', excerpt:'', category_id:'', author_id:'', body:'', tags:'', cover:'', alt_text:'', status:'draft', featured:false, published_at:'', seo_title:'', seo_description:'' })
const pageEditing = ref('sobre')
const pageForm = reactive({ slug:'sobre', title:'', summary:'', seo_title:'', seo_description:'', sections:[] as Array<{heading:string;body:string}> })
const categoryForm = reactive({ id:'', name:'', slug:'', description:'', color:'forest' })
const authorForm = reactive({ id:'', name:'', slug:'', role:'Repórter', location:'Brasil', bio:'', avatar:'' })

const statusOptions = [
  { value:'draft', label:'Rascunho' }, { value:'review', label:'Em revisão' }, { value:'returned', label:'Devolvido' },
  { value:'approved', label:'Aprovado' }, { value:'published', label:'Publicado' }, { value:'unpublished', label:'Retirado do ar' }, { value:'archived', label:'Arquivado' }
]
const tabs = [
  { id:'overview', label:'Visão geral' }, { id:'articles', label:'Publicações' }, { id:'site', label:'Identidade do portal' },
  { id:'pages', label:'Páginas institucionais' }, { id:'categories', label:'Editorias' }, { id:'authors', label:'Autores' }
]
const visibleArticles = computed(() => articles.value.filter(article =>
  (statusFilter.value === 'all' || article.status === statusFilter.value) &&
  (!search.value || `${article.title} ${article.author_name} ${article.category_name}`.toLocaleLowerCase('pt-BR').includes(search.value.toLocaleLowerCase('pt-BR')))
))
const countFor = (status: string) => dashboard.value.counts.find(item => item.status === status)?.total || 0

function adminUrl(path: string) { return `${apiBase}/admin${path}` }
async function request(path: string, method = 'GET', body?: unknown) {
  if (!session.value && path !== '/login') throw new Error('Faça login para continuar.')
  try {
    return await $fetch<any>(adminUrl(path), { method: method as any, body: body as any, headers: session.value ? { Authorization: `Bearer ${session.value.token}` } : {} })
  } catch (cause: any) {
    if (cause?.response?.status === 401 && path !== '/login') logout(false)
    throw new Error(cause?.data?.error || 'Não foi possível concluir a operação. Tente novamente.')
  }
}
function setMessage(message: string) { notice.value = message; error.value = ''; window.setTimeout(() => { if (notice.value === message) notice.value = '' }, 4500) }
function setError(cause: unknown) { error.value = cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'; notice.value = '' }

async function loadAll() {
  if (!session.value) return
  busy.value = true; error.value = ''
  try {
    const [dash, articleData, categoryData, authorData, settingData, pageData] = await Promise.all([
      request('/dashboard'), request('/articles'), request('/categories'), request('/authors'), request('/settings'), request('/pages')
    ])
    dashboard.value = dash
    articles.value = articleData.articles || []
    categories.value = categoryData.categories || []
    authors.value = authorData.authors || []
    Object.assign(settings, settingData)
    pages.value = pageData.pages || Object.values(defaultPortalPages)
    if (!pageForm.title && pages.value.length) choosePage(pages.value[0].slug)
  } catch (cause) { setError(cause) } finally { busy.value = false }
}

async function login() {
  busy.value = true; error.value = ''
  try {
    const result = await request('/login', 'POST', loginForm)
    session.value = { token: result.token, name: result.name, exp: result.exp }
    sessionStorage.setItem('pe-de-prosa-admin', JSON.stringify(session.value))
    loginForm.password = ''
    await loadAll()
  } catch (cause) { setError(cause) } finally { busy.value = false }
}
function logout(clearStorage = true) {
  if (clearStorage) {
    if (session.value) void request('/logout', 'POST').catch(() => {})
    sessionStorage.removeItem('pe-de-prosa-admin')
  }
  session.value = null
}

function newArticle() {
  articleEditing.value = null
  Object.assign(articleForm, { title:'', slug:'', excerpt:'', category_id:categories.value[0]?.id || '', author_id:authors.value[0]?.id || '', body:'', tags:'', cover:'', alt_text:'', status:'draft', featured:false, published_at:'', seo_title:'', seo_description:'' })
}
function editArticle(article: RecordItem) {
  articleEditing.value = article.id
  Object.assign(articleForm, { title:article.title, slug:article.slug, excerpt:article.excerpt, category_id:article.category_id, author_id:article.author_id, body:(article.body || []).join('\n\n'), tags:(article.tags || []).join(', '), cover:article.cover || '', alt_text:article.alt_text || '', status:article.status, featured:Boolean(article.featured), published_at:article.published_at ? String(article.published_at).slice(0,10) : '', seo_title:article.seo_title || '', seo_description:article.seo_description || '' })
}
async function saveArticle() {
  busy.value = true
  try {
    const path = articleEditing.value ? `/articles/${encodeURIComponent(articleEditing.value)}` : '/articles'
    await request(path, 'POST', { ...articleForm, tags:articleForm.tags.split(',').map(tag => tag.trim()).filter(Boolean) })
    await loadAll(); setMessage(articleForm.status === 'published' ? 'Publicação salva e publicada no portal.' : 'Publicação salva.')
    activeTab.value = 'articles'
  } catch (cause) { setError(cause) } finally { busy.value = false }
}

function choosePage(slug: string) {
  pageEditing.value = slug
  const page = pages.value.find(item => item.slug === slug) || (defaultPortalPages as any)[slug]
  if (!page) return
  Object.assign(pageForm, { slug:page.slug, title:page.title, summary:page.summary, seo_title:page.seo_title || page.title, seo_description:page.seo_description || page.summary, sections:(page.sections || []).map((section: any) => ({ heading:section.heading, body:section.body })) })
}
async function savePage() {
  busy.value = true
  try { await request('/pages','POST',pageForm); await loadAll(); choosePage(pageEditing.value); setMessage('Página institucional atualizada.') }
  catch (cause) { setError(cause) } finally { busy.value = false }
}
async function saveSettings() {
  busy.value = true
  try { const result = await request('/settings','POST',settings); Object.assign(settings,result.settings); setMessage('Identidade e configurações do portal atualizadas.') }
  catch (cause) { setError(cause) } finally { busy.value = false }
}
function editCategory(category?: RecordItem) { Object.assign(categoryForm, category ? { id:category.id,name:category.name,slug:category.slug,description:category.description,color:category.color } : { id:'',name:'',slug:'',description:'',color:'forest' }) }
async function saveCategory() {
  busy.value = true
  try { await request('/categories','POST',categoryForm); await loadAll(); editCategory(); setMessage('Editoria salva.') }
  catch (cause) { setError(cause) } finally { busy.value = false }
}
function editAuthor(author?: RecordItem) { Object.assign(authorForm, author ? { id:author.id,name:author.name,slug:author.slug,role:author.role,location:author.location,bio:author.bio,avatar:author.avatar || '' } : { id:'',name:'',slug:'',role:'Repórter',location:'Brasil',bio:'',avatar:'' }) }
async function saveAuthor() {
  busy.value = true
  try { await request('/authors','POST',authorForm); await loadAll(); editAuthor(); setMessage('Perfil de autoria salvo.') }
  catch (cause) { setError(cause) } finally { busy.value = false }
}

onMounted(() => {
  try {
    const stored = sessionStorage.getItem('pe-de-prosa-admin')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.exp > Date.now()) { session.value = parsed; loadAll() } else logout()
    }
  } catch { logout() }
})
useSeoMeta({ title: 'Painel administrativo', robots: 'noindex,nofollow' })
</script>

<template>
  <div class="admin-shell">
    <section v-if="!session" class="login-wrap">
      <NuxtLink class="back-link" to="/">← Voltar ao portal</NuxtLink>
      <div class="login-card"><span class="admin-eyebrow">PÉ DE PROSA · ADMINISTRAÇÃO</span><h1>Entre no painel</h1><p>Gerencie publicações, páginas, editorias e identidade visual do portal.</p>
        <form @submit.prevent="login"><label>Usuário<input v-model="loginForm.username" autocomplete="username" required></label><label>Senha<input v-model="loginForm.password" type="password" autocomplete="current-password" required></label><p v-if="error" class="error-text" role="alert">{{ error }}</p><button class="admin-primary" :disabled="busy">{{ busy ? 'Entrando…' : 'Acessar painel' }}</button></form>
      </div>
    </section>

    <div v-else class="admin-layout">
      <aside class="admin-sidebar"><NuxtLink class="admin-wordmark" to="/">Pé de Prosa<span>PAINEL EDITORIAL</span></NuxtLink><nav aria-label="Navegação administrativa"><button v-for="tab in tabs" :key="tab.id" :class="{active:activeTab===tab.id}" @click="activeTab=tab.id">{{ tab.label }}</button></nav><div class="sidebar-bottom"><span>Conectado como<br><strong>{{ session.name }}</strong></span><button @click="logout()">Encerrar sessão</button></div></aside>
      <main class="admin-main">
        <header class="admin-top"><div><span class="admin-eyebrow">PAINEL EDITORIAL</span><h1>{{ tabs.find(item=>item.id===activeTab)?.label }}</h1></div><div class="admin-top-actions"><NuxtLink to="/" target="_blank">Ver portal ↗</NuxtLink><button @click="loadAll" :disabled="busy">{{ busy ? 'Atualizando…' : 'Atualizar dados' }}</button></div></header>
        <p v-if="notice" class="admin-notice" role="status">{{ notice }}</p><p v-if="error && session" class="admin-error" role="alert">{{ error }}</p>

        <section v-if="activeTab==='overview'" class="admin-content"><div class="welcome-row"><div><h2>Bom dia, {{ session.name }}</h2><p>O conteúdo do Pé de Prosa fica organizado aqui.</p></div><button class="admin-primary" @click="activeTab='articles';newArticle()">+ Nova publicação</button></div><div class="metric-grid"><article><span>Publicadas</span><strong>{{ countFor('published') }}</strong><small>Visíveis no portal</small></article><article><span>Em revisão</span><strong>{{ countFor('review') }}</strong><small>Aguardando decisão editorial</small></article><article><span>Rascunhos</span><strong>{{ countFor('draft') }}</strong><small>Em preparação</small></article><article><span>Editorias</span><strong>{{ categories.length }}</strong><small>Organizam o acervo</small></article></div><div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">ATIVIDADE</span><h2>Atualizadas recentemente</h2></div><button @click="activeTab='articles'">Todas as publicações →</button></div><div class="recent-list"><button v-for="article in dashboard.recent" :key="article.id" @click="activeTab='articles';editArticle(article)"><span class="row-title">{{ article.title }}</span><span>{{ article.category_name }}</span><span class="status-badge" :class="article.status">{{ statusOptions.find(s=>s.value===article.status)?.label }}</span></button></div></div></section>

        <section v-else-if="activeTab==='articles'" class="admin-content articles-tab"><div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">ACERVO</span><h2>{{ articleEditing ? 'Editar publicação' : 'Nova publicação' }}</h2></div><button class="admin-primary" @click="newArticle">+ Nova publicação</button></div><form class="editor-form" @submit.prevent="saveArticle"><div class="editor-main"><label>Título<input v-model="articleForm.title" maxlength="160" required></label><label>Endereço da matéria<input v-model="articleForm.slug" placeholder="gerado automaticamente pelo título"></label><label>Linha fina / resumo<textarea v-model="articleForm.excerpt" rows="3" maxlength="500" required></textarea></label><label>Texto da publicação<textarea v-model="articleForm.body" rows="17" placeholder="Separe cada parágrafo por uma linha em branco" required></textarea><small>Use uma linha em branco entre os parágrafos. A marcação HTML não é aceita.</small></label><label>Assuntos, separados por vírgula<input v-model="articleForm.tags" placeholder="cidade, cultura, cotidiano"></label><label>Descrição da imagem<input v-model="articleForm.alt_text" maxlength="300" placeholder="Texto alternativo para leitores de tela"></label><label>Imagem de capa (URL HTTPS)<input v-model="articleForm.cover" placeholder="https://…"></label><label>Descrição para buscadores<textarea v-model="articleForm.seo_description" rows="2" maxlength="300"></textarea></label></div><aside class="editor-side"><label>Editoria<select v-model="articleForm.category_id" required><option value="" disabled>Escolha uma editoria</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></select></label><label>Autoria<select v-model="articleForm.author_id" required><option value="" disabled>Escolha uma autoria</option><option v-for="author in authors" :key="author.id" :value="author.id">{{ author.name }}</option></select></label><label>Status<select v-model="articleForm.status"><option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label><label>Data de publicação<input v-model="articleForm.published_at" type="date"></label><label>SEO · título<input v-model="articleForm.seo_title" maxlength="160"></label><label class="check-field"><input v-model="articleForm.featured" type="checkbox"> Destacar na página inicial</label><div class="form-actions"><button class="admin-primary" :disabled="busy">{{ busy ? 'Salvando…' : articleEditing ? 'Salvar publicação' : 'Criar publicação' }}</button><button type="button" class="admin-secondary" @click="newArticle">Limpar formulário</button></div></aside></form></div>
          <div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">LISTA</span><h2>Publicações do acervo</h2></div><div class="filters"><input v-model="search" placeholder="Buscar título, autoria ou editoria"><select v-model="statusFilter"><option value="all">Todos os status</option><option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></div></div><div class="table-wrap"><table><thead><tr><th>Publicação</th><th>Editoria</th><th>Autoria</th><th>Status</th><th></th></tr></thead><tbody><tr v-for="article in visibleArticles" :key="article.id"><td><strong>{{ article.title }}</strong><small>{{ article.updated_at }}</small></td><td>{{ article.category_name }}</td><td>{{ article.author_name }}</td><td><span class="status-badge" :class="article.status">{{ statusOptions.find(s=>s.value===article.status)?.label }}</span></td><td><button class="table-action" @click="editArticle(article)">Editar</button></td></tr></tbody></table><p v-if="!visibleArticles.length" class="empty-table">Nenhuma publicação encontrada.</p></div></div>
        </section>

        <section v-else-if="activeTab==='site'" class="admin-content"><div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">MARCA E CONFIGURAÇÃO</span><h2>Identidade do portal</h2><p>Edite os textos do cabeçalho, da página inicial e do rodapé.</p></div></div><form class="settings-form" @submit.prevent="saveSettings"><div class="settings-grid"><label>Nome da publicação<input v-model="settings.siteName" maxlength="100"></label><label>Assinatura / slogan<input v-model="settings.tagline" maxlength="180"></label><label>Texto de topo do cabeçalho<input v-model="settings.mastheadTopLine" maxlength="180"></label><label>Descrição do rodapé<textarea v-model="settings.footerDescription" rows="3" maxlength="240"></textarea></label><label>Assinatura do rodapé<input v-model="settings.footerSubline" maxlength="160"></label><label>Título da seção principal<input v-model="settings.homepageTitle" maxlength="160"></label><label>Descrição da seção principal<textarea v-model="settings.homepageDescription" rows="3" maxlength="240"></textarea></label><label>Título do bloco sobre<input v-model="settings.aboutTitle" maxlength="160"></label><label>Descrição do bloco sobre<textarea v-model="settings.aboutDescription" rows="3" maxlength="240"></textarea></label></div><div class="color-settings"><h3>Paleta do portal</h3><label>Fundo<input v-model="settings.theme.paper" type="color"></label><label>Texto<input v-model="settings.theme.ink" type="color"></label><label>Cor de destaque<input v-model="settings.theme.accent" type="color"></label><label>Cor institucional<input v-model="settings.theme.forest" type="color"></label></div><div class="settings-grid social-grid"><label>Instagram (URL HTTPS)<input v-model="settings.social.instagram" placeholder="https://instagram.com/…"></label><label>Facebook (URL HTTPS)<input v-model="settings.social.facebook" placeholder="https://facebook.com/…"></label><label>YouTube (URL HTTPS)<input v-model="settings.social.youtube" placeholder="https://youtube.com/…"></label></div><button class="admin-primary" :disabled="busy">{{ busy ? 'Salvando…' : 'Salvar identidade do portal' }}</button></form></div></section>

        <section v-else-if="activeTab==='pages'" class="admin-content"><div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">CONTEÚDO INSTITUCIONAL</span><h2>Editar páginas</h2><p>Atualize o conteúdo e o SEO das páginas permanentes do portal.</p></div><select v-model="pageEditing" @change="choosePage(pageEditing)"><option v-for="page in pages" :key="page.slug" :value="page.slug">{{ page.title }}</option></select></div><form class="settings-form" @submit.prevent="savePage"><div class="settings-grid"><label>Título<input v-model="pageForm.title" maxlength="160" required></label><label>Resumo<textarea v-model="pageForm.summary" rows="3" maxlength="400"></textarea></label><label>Título SEO<input v-model="pageForm.seo_title" maxlength="160"></label><label>Descrição SEO<textarea v-model="pageForm.seo_description" rows="3" maxlength="300"></textarea></label></div><div class="section-editor"><div class="panel-heading"><h3>Seções</h3><button type="button" class="admin-secondary" @click="pageForm.sections.push({heading:'',body:''})">+ Adicionar seção</button></div><article v-for="(section,index) in pageForm.sections" :key="index" class="section-row"><div class="section-fields"><label>Subtítulo<input v-model="section.heading" maxlength="160"></label><label>Texto<textarea v-model="section.body" rows="5" maxlength="4000"></textarea></label></div><button type="button" class="remove-section" :aria-label="`Remover seção ${index+1}`" @click="pageForm.sections.splice(index,1)">Remover seção</button></article></div><button class="admin-primary" :disabled="busy">{{ busy ? 'Salvando…' : 'Salvar página' }}</button></form></div></section>

        <section v-else-if="activeTab==='categories'" class="admin-content two-column"><div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">NAVEGAÇÃO</span><h2>Editorias do portal</h2></div><button class="admin-secondary" @click="editCategory()">+ Nova editoria</button></div><div class="simple-list"><button v-for="category in categories" :key="category.id" @click="editCategory(category)"><strong>{{ category.name }}</strong><span>{{ category.article_count }} publicações</span><small>/categoria/{{ category.slug }}</small></button></div></div><div class="admin-panel"><div class="panel-heading"><h2>{{ categoryForm.id ? 'Editar editoria' : 'Nova editoria' }}</h2></div><form class="settings-form" @submit.prevent="saveCategory"><label>Nome<input v-model="categoryForm.name" required maxlength="80"></label><label>Slug<input v-model="categoryForm.slug" placeholder="gerado pelo nome"></label><label>Descrição<textarea v-model="categoryForm.description" rows="4" maxlength="300"></textarea></label><label>Identificador de cor<input v-model="categoryForm.color" maxlength="30"></label><button class="admin-primary" :disabled="busy">Salvar editoria</button></form></div></section>

        <section v-else-if="activeTab==='authors'" class="admin-content two-column"><div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">PERFIS</span><h2>Autores e colaboradores</h2></div><button class="admin-secondary" @click="editAuthor()">+ Novo perfil</button></div><div class="simple-list"><button v-for="author in authors" :key="author.id" @click="editAuthor(author)"><strong>{{ author.name }}</strong><span>{{ author.article_count }} publicações</span><small>{{ author.role }} · {{ author.location }}</small></button></div></div><div class="admin-panel"><div class="panel-heading"><h2>{{ authorForm.id ? 'Editar perfil' : 'Novo perfil' }}</h2></div><form class="settings-form" @submit.prevent="saveAuthor"><label>Nome<input v-model="authorForm.name" required maxlength="100"></label><label>Slug<input v-model="authorForm.slug" placeholder="gerado pelo nome"></label><label>Função<input v-model="authorForm.role" maxlength="80"></label><label>Localização<input v-model="authorForm.location" maxlength="100"></label><label>Biografia<textarea v-model="authorForm.bio" rows="5" maxlength="800"></textarea></label><label>Foto de perfil (URL HTTPS)<input v-model="authorForm.avatar" placeholder="https://…"></label><button class="admin-primary" :disabled="busy">Salvar perfil</button></form></div></section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell{min-height:80vh;background:#f2f3f1;color:#1d2622}.login-wrap{min-height:75vh;display:grid;place-items:center;position:relative;padding:2rem}.back-link{position:absolute;top:2rem;left:max(24px,calc((100vw - 1320px)/2));font-size:.78rem;font-weight:700}.login-card{background:#fff;width:min(100%,460px);padding:2.5rem;box-shadow:0 20px 55px #17201d14;border:1px solid #dde1dd}.admin-eyebrow{font:700 .65rem/1.2 var(--sans);letter-spacing:.13em;color:#8c3d2c;text-transform:uppercase}.login-card h1,.admin-top h1{font:600 2rem/1.1 var(--serif);letter-spacing:-.04em;margin:.45rem 0}.login-card>p{font-size:.85rem;color:#68716b;margin:0 0 1.5rem}.login-card form,.settings-form{display:grid;gap:1rem}.login-card label,.settings-form label,.editor-form label{display:grid;gap:.35rem;font-size:.75rem;font-weight:700;color:#353e38}.login-card input,.settings-form input,.settings-form textarea,.editor-form input,.editor-form textarea,.editor-form select,.settings-form select,.filters input,.filters select{width:100%;padding:.75rem .8rem;background:#fff;border:1px solid #c9d0ca;border-radius:2px;color:#1d2622;font-size:.83rem}.login-card input:focus,.settings-form input:focus,.settings-form textarea:focus,.editor-form input:focus,.editor-form textarea:focus,.editor-form select:focus{outline:2px solid #8c3d2c}.admin-primary,.admin-secondary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:42px;padding:.65rem .95rem;border:1px solid #263b35;border-radius:2px;background:#263b35;color:#fff;font-weight:700;font-size:.75rem;cursor:pointer}.admin-primary:disabled{opacity:.55;cursor:wait}.admin-secondary{background:#fff;color:#263b35}.admin-layout{display:grid;grid-template-columns:245px minmax(0,1fr);min-height:80vh}.admin-sidebar{position:sticky;top:0;height:100vh;background:#222c27;color:#f6f7f2;padding:1.5rem 1rem;display:flex;flex-direction:column}.admin-wordmark{font:700 1.55rem/1 var(--serif);letter-spacing:-.05em;padding:.4rem .6rem 1.7rem}.admin-wordmark span{display:block;font:700 .57rem var(--sans);letter-spacing:.14em;color:#bac6ba;margin-top:.45rem}.admin-sidebar nav{display:grid;gap:.2rem}.admin-sidebar nav button{border:0;background:none;color:#d0d7d0;padding:.75rem .7rem;text-align:left;font-size:.78rem;border-radius:2px;cursor:pointer}.admin-sidebar nav button:hover,.admin-sidebar nav button.active{background:#ffffff18;color:#fff}.admin-sidebar nav button.active{box-shadow:inset 3px 0 #c47b62}.sidebar-bottom{margin-top:auto;border-top:1px solid #ffffff29;padding:.9rem .5rem .2rem;display:grid;gap:.9rem;font-size:.68rem;color:#c3cbc3}.sidebar-bottom strong{color:white}.sidebar-bottom button{justify-self:start;border:0;background:none;color:#fff;font-weight:700;font-size:.7rem;padding:0;cursor:pointer}.admin-main{min-width:0;padding:1.7rem clamp(1rem,3vw,2.7rem) 3rem}.admin-top{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid #d6dbd6;padding-bottom:1.15rem;margin-bottom:1.3rem}.admin-top h1{font-size:1.8rem;margin:.3rem 0 0}.admin-top-actions{display:flex;align-items:center;gap:1rem}.admin-top-actions a,.admin-top-actions button{font-size:.72rem;font-weight:700;color:#263b35}.admin-top-actions button{border:1px solid #c9d0ca;background:#fff;padding:.55rem .7rem;cursor:pointer}.admin-content{display:grid;gap:1.2rem}.welcome-row{display:flex;justify-content:space-between;align-items:center}.welcome-row h2{font:600 1.5rem var(--serif);margin:0}.welcome-row p{color:#68716b;font-size:.78rem;margin:.2rem 0}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.8rem}.metric-grid article,.admin-panel{background:white;border:1px solid #dfe3df}.metric-grid article{padding:1rem}.metric-grid span,.metric-grid small{display:block;color:#68716b;font-size:.7rem}.metric-grid strong{display:block;font:600 2rem var(--serif);margin:.4rem 0}.admin-panel{padding:1.2rem}.panel-heading{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}.panel-heading h2{font:600 1.2rem var(--serif);margin:.25rem 0}.panel-heading p{color:#68716b;font-size:.75rem;margin:.3rem 0}.panel-heading>button:not(.admin-primary),.panel-heading>select{border:1px solid #c9d0ca;background:#fff;padding:.55rem .7rem;color:#263b35;font-size:.7rem;font-weight:700;cursor:pointer}.recent-list{display:grid}.recent-list>button{display:grid;grid-template-columns:minmax(0,1fr) 150px 120px;gap:.8rem;align-items:center;text-align:left;padding:.8rem 0;border:0;border-top:1px solid #e5e8e4;background:#fff;font-size:.72rem;color:#657069;cursor:pointer}.row-title{font-weight:700;color:#29342e}.status-badge{display:inline-flex;width:max-content;padding:.22rem .45rem;border-radius:99px;background:#eef1ee;color:#44514a;font-size:.62rem;font-weight:700}.status-badge.published{background:#e7f2eb;color:#2c6942}.status-badge.review,.status-badge.approved{background:#f5efdf;color:#8a6c20}.status-badge.returned,.status-badge.unpublished{background:#f8e8e4;color:#943f32}.editor-form{display:grid;grid-template-columns:minmax(0,1fr) 265px;gap:1.4rem}.editor-main,.editor-side{display:grid;align-content:start;gap:.8rem}.editor-form small{font-size:.66rem;color:#6b756d;font-weight:400}.editor-form .check-field{display:flex;align-items:center;gap:.5rem}.check-field input{width:auto}.form-actions{display:grid;gap:.5rem;margin-top:.6rem}.filters{display:flex;gap:.5rem}.filters input{width:230px}.filters select{width:160px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;font-size:.72rem}th{color:#707a72;font-size:.63rem;text-transform:uppercase;letter-spacing:.08em}td,th{padding:.75rem .55rem;border-top:1px solid #e5e8e4}td strong,td small{display:block}td small{color:#849087;font-size:.62rem;margin-top:.2rem}.table-action{border:1px solid #bfc9c1;background:#fff;padding:.4rem .6rem;font-size:.67rem;font-weight:700;color:#263b35;cursor:pointer}.empty-table{font-size:.78rem;color:#68716b;text-align:center;padding:1rem}.settings-form{max-width:1000px}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.color-settings{display:flex;align-items:center;flex-wrap:wrap;gap:1rem;padding:1rem 0;border-block:1px solid #e5e8e4}.color-settings h3{width:100%;margin:0;font:600 1rem var(--serif)}.color-settings label{display:flex;align-items:center;gap:.5rem}.color-settings input[type=color]{width:38px;height:32px;padding:.15rem;cursor:pointer}.social-grid{margin-bottom:.4rem}.section-editor{border-top:1px solid #e5e8e4;padding-top:1rem}.section-editor h3{font:600 1rem var(--serif);margin:.2rem 0}.section-row{border-top:1px solid #e5e8e4;padding:1rem 0;display:flex;gap:1rem;align-items:start}.section-fields{display:grid;grid-template-columns:.7fr 1.3fr;gap:1rem;flex:1}.remove-section{border:0;background:none;color:#943f32;font-size:.7rem;font-weight:700;cursor:pointer}.two-column{grid-template-columns:.9fr 1.1fr;align-items:start}.simple-list{display:grid}.simple-list button{display:grid;grid-template-columns:1fr auto;gap:.2rem .7rem;text-align:left;padding:.8rem 0;border:0;border-top:1px solid #e5e8e4;background:#fff;cursor:pointer}.simple-list strong{font:600 .9rem var(--serif);color:#2c352f}.simple-list span,.simple-list small{font-size:.65rem;color:#768077}.simple-list small{grid-column:1/-1}.admin-notice,.admin-error{margin:0 0 1rem;padding:.75rem 1rem;font-size:.75rem}.admin-notice{background:#e5f2e9;color:#2e6240}.admin-error{background:#f8e8e4;color:#8c3429}.error-text{color:#943f32;font-size:.73rem}
@media(max-width:1000px){.admin-layout{grid-template-columns:200px minmax(0,1fr)}.editor-form{grid-template-columns:1fr}.editor-side{grid-template-columns:repeat(2,minmax(0,1fr));align-items:end}.editor-side .form-actions{grid-column:1/-1}.metric-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.admin-layout{display:block}.admin-sidebar{position:static;height:auto;padding:.8rem}.admin-wordmark{padding:.35rem .4rem .8rem}.admin-sidebar nav{display:flex;overflow:auto;gap:.3rem}.admin-sidebar nav button{white-space:nowrap;padding:.55rem}.sidebar-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:.7rem;padding:.55rem .4rem 0}.admin-main{padding:1rem .75rem 2rem}.admin-top{align-items:start}.admin-top-actions{flex-direction:column;align-items:end;gap:.4rem}.metric-grid{gap:.5rem}.metric-grid article{padding:.75rem}.metric-grid strong{font-size:1.65rem}.panel-heading{align-items:start;flex-wrap:wrap}.recent-list>button{grid-template-columns:1fr auto}.recent-list>button>span:nth-child(2){display:none}.settings-grid,.two-column,.section-fields{grid-template-columns:1fr}.filters{width:100%;flex-direction:column}.filters input,.filters select{width:100%}.editor-side{grid-template-columns:1fr}.editor-side .form-actions{grid-column:auto}.section-row{display:block}.remove-section{margin-top:.5rem}.login-card{padding:1.5rem}.back-link{left:1rem;top:1rem}}
</style>
