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
const totalArticles = computed(() => dashboard.value.counts.reduce((total, item) => total + item.total, 0))
const publishedShare = computed(() => totalArticles.value ? Math.round(countFor('published') / totalArticles.value * 100) : 0)
const metrics = computed(() => [
  { id:'published', label:'Publicadas', value:countFor('published'), detail:'No ar para os leitores', icon:'published', tone:'green' },
  { id:'review', label:'Em revisão', value:countFor('review'), detail:'Precisam de avaliação', icon:'review', tone:'amber' },
  { id:'draft', label:'Rascunhos', value:countFor('draft'), detail:'Em preparação editorial', icon:'draft', tone:'blue' },
  { id:'categories', label:'Editorias', value:categories.value.length, detail:'Seções do portal', icon:'categories', tone:'rust' }
])
const workflow = computed(() => [
  { status:'draft', label:'Rascunhos', value:countFor('draft'), tone:'blue' },
  { status:'review', label:'Em revisão', value:countFor('review'), tone:'amber' },
  { status:'approved', label:'Aprovados', value:countFor('approved'), tone:'teal' },
  { status:'published', label:'Publicados', value:countFor('published'), tone:'green' }
])

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
function openStatus(status: string) { statusFilter.value = status; activeTab.value = 'articles' }
function editRecent(article: RecordItem) {
  const completeArticle = articles.value.find(item => item.id === article.id) || article
  activeTab.value = 'articles'
  editArticle(completeArticle)
}

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
    const firstPage = pages.value[0]
    if (!pageForm.title && firstPage) choosePage(firstPage.slug)
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
      <aside class="admin-sidebar"><NuxtLink class="admin-wordmark" to="/"><span class="admin-mark">P</span><span class="brand-copy"><strong>Pé de Prosa</strong><small>PAINEL EDITORIAL</small></span></NuxtLink><div class="sidebar-caption">ESPAÇO DE TRABALHO</div><nav aria-label="Navegação administrativa"><button v-for="tab in tabs" :key="tab.id" :class="{active:activeTab===tab.id}" :aria-current="activeTab===tab.id ? 'page' : undefined" @click="activeTab=tab.id"><AdminIcon :name="tab.id" size="18"/><span>{{ tab.label }}</span><span v-if="activeTab===tab.id" class="nav-indicator"/></button></nav><div class="sidebar-bottom"><div class="user-avatar">{{ session.name.split(' ').map((part:string)=>part[0]).slice(0,2).join('') }}</div><div class="user-details"><span>Conectado como</span><strong>{{ session.name }}</strong></div><button class="logout-button" aria-label="Encerrar sessão" @click="logout()">↗</button></div></aside>
      <main class="admin-main">
        <header class="admin-top"><div class="top-title"><span class="breadcrumb-label">PÉ DE PROSA <span aria-hidden="true">/</span> ADMINISTRAÇÃO</span><h1>{{ tabs.find(item=>item.id===activeTab)?.label }}</h1></div><div class="admin-top-actions"><NuxtLink class="portal-link" to="/" target="_blank"><AdminIcon name="arrow" size="16"/> Ver portal</NuxtLink><button class="refresh-button" @click="loadAll" :disabled="busy"><AdminIcon name="clock" size="16"/>{{ busy ? 'Atualizando…' : 'Atualizar dados' }}</button></div></header>
        <p v-if="notice" class="admin-notice" role="status">{{ notice }}</p><p v-if="error && session" class="admin-error" role="alert">{{ error }}</p>

        <section v-if="activeTab==='overview'" class="admin-content dashboard-content">
          <div class="dashboard-hero"><div class="hero-copy"><span class="hero-kicker"><span class="live-dot"/> VISÃO DO PORTAL</span><h2>Bem-vindo, {{ session.name.split(' ')[0] }}</h2><p>Seu espaço editorial em um só lugar. Acompanhe o acervo e avance com as próximas publicações.</p><div class="hero-actions"><button class="admin-primary" @click="activeTab='articles';newArticle()"><AdminIcon name="edit" size="17"/> Nova publicação</button><button class="hero-secondary" @click="activeTab='site'"><AdminIcon name="site" size="17"/> Editar identidade</button></div></div><div class="hero-stat"><div class="stat-orbit"><span><strong>{{ totalArticles }}</strong><small>no acervo</small></span></div><div class="hero-stat-copy"><span>SAÚDE DO ACERVO</span><strong>{{ publishedShare }}% publicado</strong><div class="progress-track"><i :style="{width:`${publishedShare}%`}"/></div><small>{{ countFor('published') }} matérias visíveis no portal</small></div></div></div>

          <div class="metric-grid"><button v-for="metric in metrics" :key="metric.id" class="metric-card" :class="`tone-${metric.tone}`" @click="metric.id==='categories' ? activeTab='categories' : openStatus(metric.id)"><span class="metric-icon"><AdminIcon :name="metric.icon" size="19"/></span><span class="metric-copy"><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong><span>{{ metric.detail }}</span></span><AdminIcon class="metric-arrow" name="arrow" size="16"/></button></div>

          <div class="overview-grid"><section class="admin-panel workflow-panel"><div class="panel-heading"><div><span class="admin-eyebrow">ESTAÇÃO EDITORIAL</span><h2>Fluxo de publicações</h2><p>Acesse cada etapa e continue o trabalho de onde parou.</p></div><span class="panel-icon"><AdminIcon name="articles" size="19"/></span></div><div class="workflow-track"><button v-for="(step,index) in workflow" :key="step.status" class="workflow-step" :class="`workflow-${step.tone}`" @click="openStatus(step.status)"><span class="step-top"><span class="step-number">0{{ index+1 }}</span><strong>{{ step.value }}</strong></span><span class="step-label">{{ step.label }}</span><span class="step-bar"><i :style="{width:`${totalArticles ? Math.max(step.value / totalArticles * 100, step.value ? 8 : 0) : 0}%`}"/></span></button></div><button class="workflow-link" @click="statusFilter='all';activeTab='articles'">Abrir acervo completo <AdminIcon name="arrow" size="15"/></button></section>

            <section class="admin-panel shortcuts-panel"><div class="panel-heading"><div><span class="admin-eyebrow">ATALHOS</span><h2>Editar o portal</h2><p>Ações frequentes para manter tudo atualizado.</p></div></div><button class="shortcut-row" @click="activeTab='pages'"><span class="shortcut-icon pages"><AdminIcon name="pages" size="18"/></span><span><strong>Páginas institucionais</strong><small>Sobre, política editorial e privacidade</small></span><AdminIcon name="arrow" size="16"/></button><button class="shortcut-row" @click="activeTab='categories'"><span class="shortcut-icon categories"><AdminIcon name="categories" size="18"/></span><span><strong>Editorias</strong><small>{{ categories.length }} seções organizam o acervo</small></span><AdminIcon name="arrow" size="16"/></button><button class="shortcut-row" @click="activeTab='authors'"><span class="shortcut-icon authors"><AdminIcon name="authors" size="18"/></span><span><strong>Autores e colaboradores</strong><small>{{ authors.length }} perfis editoriais</small></span><AdminIcon name="arrow" size="16"/></button></section></div>

          <section class="admin-panel recent-panel"><div class="panel-heading"><div><span class="admin-eyebrow">MOVIMENTAÇÃO</span><h2>Atualizadas recentemente</h2><p>Abra uma publicação para continuar a edição.</p></div><button class="text-action" @click="statusFilter='all';activeTab='articles'">Ver todas <AdminIcon name="arrow" size="15"/></button></div><div v-if="dashboard.recent.length" class="recent-grid"><article v-for="article in dashboard.recent.slice(0,4)" :key="article.id" class="recent-card"><button class="recent-image" :aria-label="`Editar ${article.title}`" @click="editRecent(article)"><ArticleArtwork :article="article"/><span class="recent-edit-icon"><AdminIcon name="edit" size="15"/></span></button><div class="recent-card-copy"><div class="recent-card-meta"><span>{{ article.category_name || 'Publicação' }}</span><span class="status-badge" :class="article.status">{{ statusOptions.find(s=>s.value===article.status)?.label }}</span></div><button class="recent-title" @click="editRecent(article)">{{ article.title }}</button><span class="recent-author">{{ article.author_name || 'Equipe editorial' }}</span></div></article></div><div v-else class="dashboard-empty"><span class="empty-icon"><AdminIcon name="articles" size="24"/></span><strong>Seu acervo começa aqui</strong><p>Crie a primeira publicação para iniciar o fluxo editorial.</p><button class="admin-secondary" @click="activeTab='articles';newArticle()">Criar publicação</button></div></section>
        </section>

        <section v-else-if="activeTab==='articles'" class="admin-content articles-tab"><div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">ACERVO</span><h2>{{ articleEditing ? 'Editar publicação' : 'Nova publicação' }}</h2><p>Escreva, revise a apresentação e escolha o destino editorial.</p></div><button class="admin-primary" @click="newArticle"><AdminIcon name="edit" size="17"/> Nova publicação</button></div><form class="editor-form" @submit.prevent="saveArticle"><div class="editor-main"><label>Título<input v-model="articleForm.title" maxlength="160" required></label><label>Endereço da matéria<input v-model="articleForm.slug" placeholder="gerado automaticamente pelo título"></label><label>Linha fina / resumo<textarea v-model="articleForm.excerpt" rows="3" maxlength="500" required></textarea></label><label>Texto da publicação<textarea v-model="articleForm.body" rows="17" placeholder="Separe cada parágrafo por uma linha em branco" required></textarea><small>Use uma linha em branco entre os parágrafos. A marcação HTML não é aceita.</small></label><label>Assuntos, separados por vírgula<input v-model="articleForm.tags" placeholder="cidade, cultura, cotidiano"></label><label>Descrição da imagem<input v-model="articleForm.alt_text" maxlength="300" placeholder="Texto alternativo para leitores de tela"></label><label>Imagem de capa (URL HTTPS)<input v-model="articleForm.cover" placeholder="https://…"></label><label>Descrição para buscadores<textarea v-model="articleForm.seo_description" rows="2" maxlength="300"></textarea></label></div><aside class="editor-side"><div class="cover-preview-card"><div class="cover-preview-label"><AdminIcon name="image" size="16"/><span>Prévia da capa</span></div><ArticleArtwork :article="{title:articleForm.title || 'Sua imagem de capa',slug:articleForm.slug,cover:articleForm.cover,category:articleForm.category_id,alt_text:articleForm.alt_text}"/><p>A composição acompanha o assunto da matéria. A imagem muda conforme a URL informada.</p></div><label>Editoria<select v-model="articleForm.category_id" required><option value="" disabled>Escolha uma editoria</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></select></label><label>Autoria<select v-model="articleForm.author_id" required><option value="" disabled>Escolha uma autoria</option><option v-for="author in authors" :key="author.id" :value="author.id">{{ author.name }}</option></select></label><label>Status<select v-model="articleForm.status"><option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label><label>Data de publicação<input v-model="articleForm.published_at" type="date"></label><label>SEO · título<input v-model="articleForm.seo_title" maxlength="160"></label><label class="check-field"><input v-model="articleForm.featured" type="checkbox"> Destacar na página inicial</label><div class="form-actions"><button class="admin-primary" :disabled="busy">{{ busy ? 'Salvando…' : articleEditing ? 'Salvar publicação' : 'Criar publicação' }}</button><button type="button" class="admin-secondary" @click="newArticle">Limpar formulário</button></div></aside></form></div>
          <div class="admin-panel"><div class="panel-heading"><div><span class="admin-eyebrow">LISTA DO ACERVO</span><h2>{{ visibleArticles.length }} publicações encontradas</h2><p>Filtre por título, autoria ou etapa editorial.</p></div><div class="filters"><label class="search-wrap"><AdminIcon name="search" size="17"/><input v-model="search" aria-label="Buscar publicações" placeholder="Buscar publicações"></label><select v-model="statusFilter"><option value="all">Todos os status</option><option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></div></div><div class="table-wrap"><table><thead><tr><th>Capa</th><th>Publicação</th><th>Editoria</th><th>Autoria</th><th>Status</th><th></th></tr></thead><tbody><tr v-for="article in visibleArticles" :key="article.id"><td><span class="table-cover"><ArticleArtwork :article="article"/></span></td><td class="article-table-title"><strong>{{ article.title }}</strong><small>{{ article.updated_at ? `Atualizada ${article.updated_at}` : 'No acervo editorial' }}</small></td><td>{{ article.category_name }}</td><td>{{ article.author_name }}</td><td><span class="status-badge" :class="article.status">{{ statusOptions.find(s=>s.value===article.status)?.label }}</span></td><td><button class="table-action" @click="editArticle(article)"><AdminIcon name="edit" size="15"/> Editar</button></td></tr></tbody></table><p v-if="!visibleArticles.length" class="empty-table">Nenhuma publicação encontrada. Tente ajustar os filtros.</p></div></div>
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

<style scoped>
@media(max-width:1100px){
  .admin-layout{grid-template-columns:210px minmax(0,1fr)}
  .admin-sidebar{padding-inline:.75rem}
  .admin-main{padding-inline:1.1rem}
  .dashboard-hero{grid-template-columns:minmax(0,1fr) minmax(220px,.8fr);gap:.8rem;padding:1.2rem}
  .editor-form{grid-template-columns:minmax(0,1fr) 260px;gap:1rem}
  .recent-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:900px){
  .admin-shell{margin:1rem 0 1.5rem;border-radius:14px}
  .admin-layout{grid-template-columns:190px minmax(0,1fr)}
  .admin-main{padding:1rem .9rem 2rem}
  .dashboard-hero{grid-template-columns:1fr}
  .hero-stat{justify-content:flex-start;max-width:100%}
  .editor-form{grid-template-columns:1fr}
  .editor-side{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
  .editor-side .form-actions,.cover-preview-card{grid-column:1/-1}
  .recent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .shortcuts-panel{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:700px){
  .admin-shell{margin:.65rem 0 1rem;border-radius:10px}
  .admin-layout{display:block;min-height:0}
  .admin-sidebar{position:relative;top:auto;height:auto;min-height:0;padding:.75rem .75rem .55rem}
  .admin-wordmark{padding:.1rem .25rem .65rem}
  .admin-sidebar nav{display:flex;gap:.35rem;overflow-x:auto;padding:.1rem .1rem .55rem;scrollbar-width:thin;-webkit-overflow-scrolling:touch;overscroll-behavior-inline:contain}
  .admin-sidebar nav button{flex:0 0 auto;min-height:40px;white-space:nowrap;padding:.55rem .7rem;font-size:.68rem}
  .sidebar-bottom{grid-template-columns:32px minmax(0,1fr) 34px;gap:.5rem;margin-top:.35rem;padding:.55rem .2rem 0}
  .admin-main{padding:.85rem .7rem 1.4rem}
  .admin-top{align-items:flex-start;flex-wrap:wrap;gap:.6rem;padding-bottom:.8rem;margin-bottom:.9rem}
  .admin-top>div:first-child{min-width:0;flex:1}
  .admin-top h1{font-size:1.45rem;overflow-wrap:anywhere}
  .admin-top-actions{display:flex;flex-direction:row;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:.45rem}
  .admin-top-actions a,.admin-top-actions button{min-height:40px;padding:.5rem .65rem;font-size:.66rem}
  .admin-content,.dashboard-content{gap:.8rem}
  .welcome-row{align-items:flex-start;flex-wrap:wrap;gap:.7rem}
  .welcome-row h2{font-size:1.3rem}
  .dashboard-hero{padding:1rem;gap:.9rem}
  .hero-copy h2{font-size:1.7rem}
  .hero-copy p{font-size:.76rem}
  .hero-actions button,.hero-secondary{min-height:42px;padding:.6rem .7rem;font-size:.68rem}
  .hero-stat{gap:.8rem;padding:.75rem}
  .stat-orbit{width:78px;height:78px;border-width:5px}
  .stat-orbit strong{font-size:1.4rem}
  .hero-stat-copy>span{font-size:.58rem}
  .hero-stat-copy small{font-size:.62rem}
  .metric-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}
  .metric-card{grid-template-columns:34px minmax(0,1fr) 14px;gap:.5rem;padding:.7rem}
  .metric-icon{width:32px;height:32px}
  .metric-copy small{font-size:.62rem}
  .metric-copy strong{font-size:1.35rem}
  .metric-copy>span{font-size:.57rem;line-height:1.35}
  .admin-panel{padding:.85rem;border-radius:9px}
  .panel-heading{align-items:flex-start;flex-wrap:wrap;gap:.55rem}
  .panel-heading h2{font-size:1.05rem}
  .panel-heading p{font-size:.68rem}
  .panel-heading button,.panel-heading select{min-height:40px}
  .workflow-track{grid-template-columns:repeat(2,minmax(0,1fr))}
  .shortcuts-panel{display:block}
  .shortcut-row{grid-template-columns:36px minmax(0,1fr) 16px;padding:.7rem .25rem}
  .shortcut-row strong{font-size:.7rem}
  .shortcut-row small{font-size:.6rem}
  .recent-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}
  .recent-card-copy{padding:.6rem}
  .recent-card-meta{font-size:.56rem}
  .recent-title{font-size:.76rem}
  .recent-author{font-size:.6rem}
  .editor-form{grid-template-columns:minmax(0,1fr);gap:1rem}
  .editor-main{grid-template-columns:minmax(0,1fr)}
  .editor-main>label{grid-column:1/-1!important}
  .editor-side{grid-template-columns:minmax(0,1fr)}
  .editor-side .form-actions,.cover-preview-card{grid-column:auto}
  .editor-form input,.editor-form textarea,.editor-form select,.settings-form input,.settings-form textarea,.settings-form select,.filters select{font-size:16px}
  .filters{width:100%;flex-direction:column;align-items:stretch}
  .search-wrap,.search-wrap input,.filters select{width:100%;min-width:0}
  .table-wrap{max-width:100%;overscroll-behavior-inline:contain}
  .table-wrap table{min-width:620px}
  .settings-grid,.two-column,.section-fields{grid-template-columns:minmax(0,1fr)}
  .section-row{display:block}
  .remove-section{min-height:40px;margin-top:.4rem;padding:.4rem 0}
  .login-wrap{min-height:560px;padding:1rem}
  .login-card{width:min(100%,440px);padding:1.25rem}
  .login-card input{min-height:46px;font-size:16px}
  .back-link{left:1rem;top:1rem}
}
@media(max-width:380px){
  .admin-main{padding-inline:.55rem}
  .admin-top{display:grid;grid-template-columns:minmax(0,1fr)}
  .admin-top-actions{justify-content:stretch}
  .admin-top-actions>*{flex:1}
  .metric-grid{grid-template-columns:minmax(0,1fr)}
  .recent-grid{grid-template-columns:minmax(0,1fr)}
  .workflow-track{grid-template-columns:minmax(0,1fr)}
  .hero-stat{align-items:flex-start;gap:.65rem;padding:.65rem}
  .stat-orbit{width:66px;height:66px}
  .hero-stat-copy{min-width:0}
  .panel-heading>button,.text-action{max-width:100%;white-space:normal}
}
</style>

<style scoped>
.admin-shell{--admin-ink:#202a24;--admin-muted:#748078;--admin-line:#e5e8e2;--admin-canvas:#f3f5f1;--admin-deep:#1d332c;min-height:80vh;margin:1.5rem 0 2.25rem;overflow:hidden;border:1px solid #dfe4dd;border-radius:18px;background:var(--admin-canvas);color:var(--admin-ink);box-shadow:0 20px 60px rgba(30,42,35,.08)}
.login-wrap{min-height:690px;background:linear-gradient(100deg,rgba(22,41,34,.88),rgba(22,41,34,.25)),url('/images/editorial/neighborhood-meeting.webp') center 48%/cover}
.back-link{color:#fff}.login-card{width:min(100%,440px);padding:2.3rem;border:1px solid #ffffff9c;border-radius:14px;background:#fffefaf5;box-shadow:0 26px 65px #101d1870;backdrop-filter:blur(12px)}
.admin-eyebrow{font:800 .62rem/1.2 var(--sans);letter-spacing:.14em;color:#984d39;text-transform:uppercase}.login-card h1{font:600 2rem/1.12 var(--serif);letter-spacing:-.04em;margin:.55rem 0}.login-card>p{font-size:.85rem;line-height:1.6;color:#68716b;margin:0 0 1.4rem}
.login-card label,.settings-form label,.editor-form label{font-size:.72rem;font-weight:750;color:#39433c}.login-card input,.settings-form input,.settings-form textarea,.editor-form input,.editor-form textarea,.editor-form select,.settings-form select,.filters input,.filters select{min-height:42px;border:1px solid #d4dad3;border-radius:7px;transition:border-color .18s ease,box-shadow .18s ease}.settings-form textarea,.editor-form textarea{resize:vertical;line-height:1.55}
.login-card input:focus,.settings-form input:focus,.settings-form textarea:focus,.editor-form input:focus,.editor-form textarea:focus,.editor-form select:focus,.settings-form select:focus,.filters input:focus,.filters select:focus{outline:0;border-color:#8d4b38;box-shadow:0 0 0 3px #8d4b3821}
.admin-primary,.admin-secondary{min-height:42px;border-radius:7px;font-weight:750;transition:transform .15s ease,background .15s ease,box-shadow .15s ease}.admin-primary:hover{background:#2c493e;box-shadow:0 6px 14px #1d332c24;transform:translateY(-1px)}.admin-primary:disabled{transform:none}.admin-secondary{border-color:#d5ddd5}.admin-secondary:hover{background:#f5f7f3}
.admin-layout{grid-template-columns:258px minmax(0,1fr);min-height:880px}.admin-sidebar{background:linear-gradient(180deg,#20372f,#1a3028);padding:1.35rem 1rem}.admin-wordmark{display:flex;align-items:center;gap:.7rem;padding:.2rem .4rem 1.6rem;color:#fff}.admin-mark{display:grid!important;width:40px;height:40px;place-items:center;border:1px solid #e7d8c3a3;border-radius:12px;background:#f6ead51a;color:#f4e4cb;font:600 1.35rem/1 var(--serif)!important;letter-spacing:-.05em!important;margin:0!important}.brand-copy strong{display:block;font:700 1.18rem/1.1 var(--serif);letter-spacing:-.045em}.brand-copy small{display:block;margin-top:.32rem;color:#c7d1c7;font:750 .53rem var(--sans);letter-spacing:.14em}.sidebar-caption{padding:.35rem .65rem .55rem;color:#9daea2;font-size:.56rem;font-weight:800;letter-spacing:.14em}
.admin-sidebar nav{gap:.28rem}.admin-sidebar nav button{position:relative;display:flex;align-items:center;gap:.7rem;border-radius:8px;padding:.72rem .68rem;font-size:.75rem;font-weight:600;transition:background .16s ease,color .16s ease}.admin-sidebar nav button svg{color:#aab9ad}.admin-sidebar nav button:hover{background:#ffffff0c}.admin-sidebar nav button.active{background:#f1f4ed;color:#243930;box-shadow:0 5px 13px #10231c20}.admin-sidebar nav button.active svg{color:#874a37}.nav-indicator{width:5px;height:5px;margin-left:auto;border-radius:50%;background:#ad6951}
.sidebar-bottom{display:grid;grid-template-columns:36px 1fr 32px;align-items:center;gap:.65rem;padding:.9rem .3rem .15rem}.user-avatar{display:grid;width:34px;height:34px;place-items:center;border-radius:50%;background:#e6d7c0;color:#35493d;font:700 .72rem var(--sans)}.user-details{display:grid;gap:.1rem;min-width:0;color:#b8c7ba;font-size:.6rem}.user-details strong{overflow:hidden;color:#fff;font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.logout-button{display:grid;width:30px;height:30px;place-items:center;border:1px solid #ffffff30;border-radius:7px;background:transparent;color:#fff;cursor:pointer}
.admin-main{padding:1.55rem clamp(1rem,3vw,2.45rem) 2.5rem}.admin-top{align-items:center;gap:1rem;border-bottom:1px solid #dfe3dd}.breadcrumb-label{display:flex;gap:.45rem;align-items:center;color:#818b82;font-size:.57rem;font-weight:800;letter-spacing:.12em}.breadcrumb-label span{color:#b2b8b0}.admin-top h1{font:600 1.8rem/1.08 var(--serif);letter-spacing:-.04em}.admin-top-actions{gap:.55rem}.portal-link,.refresh-button{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:38px;padding:.55rem .72rem;border:1px solid #d8ded6;border-radius:7px;background:#fff;color:#34443a;font-size:.68rem;font-weight:750}.refresh-button{cursor:pointer}.refresh-button:disabled{opacity:.6;cursor:wait}
.admin-content{gap:1.15rem}.dashboard-content{gap:1rem}.admin-panel{min-width:0;padding:1.2rem;border:1px solid #e2e6df;border-radius:12px;background:#fff;box-shadow:0 5px 18px #1f2a2209}.panel-heading{align-items:center;gap:1rem}.panel-heading h2{font:600 1.2rem/1.2 var(--serif);letter-spacing:-.025em}.panel-heading p{font-size:.72rem;line-height:1.5}.panel-icon{display:grid;width:38px;height:38px;place-items:center;border:1px solid #e2e8df;border-radius:10px;background:#f4f7f1;color:#365345}.text-action,.panel-heading>button:not(.admin-primary),.panel-heading>select{align-items:center;gap:.35rem;border:1px solid #dce1da;border-radius:7px;padding:.55rem .72rem;font-size:.69rem}.text-action:hover{color:#914d38}
.admin-notice,.admin-error{border-radius:8px}.admin-notice{background:#e8f4eb;color:#2e6240}.admin-error{background:#faeae6;color:#8c3429}
.dashboard-hero{position:relative;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);gap:1.4rem;align-items:center;overflow:hidden;padding:1.55rem 1.7rem;border:1px solid #dde6dc;border-radius:14px;background:radial-gradient(circle at 82% 17%,#e0e9dd 0,transparent 32%),linear-gradient(120deg,#fffefa,#f2f5ed 78%);box-shadow:0 8px 24px #243d3010}.hero-copy{max-width:640px}.hero-kicker{display:flex;align-items:center;gap:.45rem;color:#4d6858;font-size:.59rem;font-weight:850;letter-spacing:.13em}.live-dot{width:7px;height:7px;border-radius:50%;background:#6c9874;box-shadow:0 0 0 4px #6c98741c}.hero-copy h2{font:600 clamp(1.8rem,3.4vw,2.5rem)/1.12 var(--serif);letter-spacing:-.045em;margin:.65rem 0 .3rem}.hero-copy p{color:#687269;font-size:.78rem;line-height:1.6;margin:0}.hero-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}.hero-secondary{display:inline-flex;align-items:center;gap:.45rem;min-height:42px;padding:.62rem .85rem;border:1px solid #d7dfd5;border-radius:7px;background:#fffefa;color:#32493d;font-size:.72rem;font-weight:750;cursor:pointer}.hero-stat{display:flex;align-items:center;justify-content:center;gap:1.1rem;padding:1rem 1.1rem;border:1px solid #e2e8df;border-radius:12px;background:#ffffffad}.stat-orbit{display:grid;width:102px;height:102px;flex:none;place-items:center;border:7px solid #dce7d9;border-right-color:#527961;border-bottom-color:#527961;border-radius:50%;transform:rotate(-35deg)}.stat-orbit>span{display:grid;place-items:center;transform:rotate(35deg)}.stat-orbit strong{font:600 1.75rem/1 var(--serif);letter-spacing:-.05em}.stat-orbit small{margin-top:.2rem;color:#748078;font-size:.55rem}.hero-stat-copy{display:grid;gap:.35rem}.hero-stat-copy>span{color:#78837a;font-size:.54rem;font-weight:850;letter-spacing:.1em}.hero-stat-copy strong{font-size:.76rem;color:#314b3b}.hero-stat-copy small{color:#748078;font-size:.6rem}.progress-track{height:6px;overflow:hidden;border-radius:99px;background:#e8ece5}.progress-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#758f70,#365c47);transition:width .3s ease}
.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem}.metric-card{display:grid;grid-template-columns:42px minmax(0,1fr) 16px;align-items:center;gap:.65rem;min-width:0;padding:.9rem;border:1px solid #e1e5de;border-radius:11px;background:#fff;text-align:left;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.metric-card:hover{transform:translateY(-2px);border-color:#ccd5ca;box-shadow:0 8px 20px #273c2c12}.metric-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:11px}.tone-green .metric-icon{background:#eaf3eb;color:#48734e}.tone-amber .metric-icon{background:#f8f0dd;color:#9b792e}.tone-blue .metric-icon{background:#e9eef4;color:#496986}.tone-rust .metric-icon{background:#f7ebe7;color:#a4543b}.metric-copy{display:grid;gap:.1rem;min-width:0}.metric-copy small{color:#758078;font-size:.63rem;font-weight:700}.metric-copy strong{font:600 1.55rem/1.05 var(--serif);letter-spacing:-.04em}.metric-copy>span{overflow:hidden;color:#879088;font-size:.57rem;text-overflow:ellipsis;white-space:nowrap}.metric-arrow{color:#9aa39b;transition:transform .15s ease}.metric-card:hover .metric-arrow{transform:translate(2px,-2px)}
.overview-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:.9rem;align-items:stretch}.workflow-panel,.shortcuts-panel{height:100%}.workflow-track{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}.workflow-step{display:grid;gap:.4rem;min-width:0;padding:.75rem;border:1px solid #e8ebe5;border-radius:9px;background:#fcfdfa;text-align:left;cursor:pointer;transition:border-color .16s ease,transform .16s ease}.workflow-step:hover{transform:translateY(-2px);border-color:#cbd5c9}.step-top{display:flex;align-items:center;justify-content:space-between;gap:.35rem}.step-number{color:#a0a89f;font-size:.52rem;font-weight:850;letter-spacing:.08em}.step-top strong{font:600 1.15rem/1 var(--serif)}.step-label{overflow:hidden;color:#677269;font-size:.59rem;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.step-bar{height:4px;overflow:hidden;border-radius:99px;background:#e9ece7}.step-bar i{display:block;height:100%;border-radius:inherit;background:#71889b}.workflow-amber .step-bar i{background:#be9a4e}.workflow-teal .step-bar i{background:#658d8a}.workflow-green .step-bar i{background:#5c8a62}.workflow-link{display:inline-flex;align-items:center;gap:.4rem;margin-top:.8rem;padding:0;border:0;background:transparent;color:#365744;font-size:.67rem;font-weight:800;cursor:pointer}.workflow-link:hover{color:#914d38}
.shortcut-row{display:grid;grid-template-columns:38px minmax(0,1fr) 16px;align-items:center;gap:.65rem;width:100%;padding:.62rem 0;border:0;border-top:1px solid #edf0eb;background:#fff;text-align:left;cursor:pointer}.shortcut-row:first-of-type{border-top:0}.shortcut-row>span:nth-child(2){display:grid;gap:.1rem}.shortcut-row strong{color:#334137;font-size:.67rem}.shortcut-row small{color:#808a81;font-size:.57rem}.shortcut-row>svg:last-child{color:#89948a}.shortcut-row:hover strong{color:#8c4c38}.shortcut-icon{display:grid;width:36px;height:36px;place-items:center;border-radius:10px}.shortcut-icon.pages{background:#eef2f7;color:#536d88}.shortcut-icon.categories{background:#f8efe0;color:#a17b37}.shortcut-icon.authors{background:#eaf2ed;color:#4c7557}
.recent-panel .panel-heading{margin-bottom:.8rem}.recent-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem}.recent-card{overflow:hidden;border:1px solid #e7eae4;border-radius:9px;background:#fff;transition:transform .16s ease,box-shadow .16s ease}.recent-card:hover{transform:translateY(-2px);box-shadow:0 8px 19px #28382c14}.recent-image{position:relative;display:block;width:100%;padding:0;overflow:hidden;border:0;background:#e8e9e2;cursor:pointer}.recent-image :deep(.cover-art){min-height:0;aspect-ratio:1.9}.recent-edit-icon{position:absolute;right:.5rem;top:.5rem;display:grid;width:27px;height:27px;place-items:center;border-radius:7px;background:#fffefaed;color:#314b3b;opacity:0;transition:opacity .16s ease}.recent-card:hover .recent-edit-icon,.recent-image:focus-visible .recent-edit-icon{opacity:1}.recent-card-copy{display:grid;gap:.42rem;padding:.7rem}.recent-card-meta{display:flex;align-items:center;justify-content:space-between;gap:.35rem;color:#8a938a;font-size:.54rem}.recent-card-meta>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.recent-card-meta .status-badge{flex:none}.recent-title{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;min-height:2.4em;padding:0;border:0;background:transparent;color:#2b362f;font:600 .77rem/1.25 var(--serif);text-align:left;cursor:pointer}.recent-title:hover{color:#914d39}.recent-author{overflow:hidden;color:#808a81;font-size:.57rem;text-overflow:ellipsis;white-space:nowrap}.dashboard-empty{display:grid;justify-items:center;padding:2.2rem 1rem;text-align:center}.empty-icon{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:#edf2eb;color:#486650}.dashboard-empty strong{margin-top:.75rem;font:600 1.05rem var(--serif)}.dashboard-empty p{margin:.35rem 0 .85rem;color:#7b857d;font-size:.7rem}
.status-badge{display:inline-flex;align-items:center;width:max-content;padding:.23rem .52rem;border:1px solid transparent;border-radius:999px;font-size:.59rem;font-weight:800;white-space:nowrap}.status-badge.published{background:#e8f2e8;border-color:#d8e7d8;color:#386442}.status-badge.review,.status-badge.approved{background:#f6f0df;border-color:#ece3c8;color:#856c2c}.status-badge.returned,.status-badge.unpublished{background:#f8eae5;border-color:#f0d8ce;color:#943f32}.status-badge.draft{background:#eaf0f6;border-color:#dbe4ee;color:#4b6984}.status-badge.archived{background:#f0efed;border-color:#e4e2de;color:#6b6b66}
.editor-form{grid-template-columns:minmax(0,1fr) 290px;gap:1.35rem}.editor-main,.editor-side{display:grid;align-content:start;gap:.78rem}.editor-main{grid-template-columns:repeat(2,minmax(0,1fr))}.editor-main>label:first-child,.editor-main>label:nth-child(2),.editor-main>label:nth-child(3),.editor-main>label:nth-child(4),.editor-main>label:nth-child(7),.editor-main>label:nth-child(8){grid-column:1/-1}.editor-form small{font-size:.64rem;color:#79837a;font-weight:450;line-height:1.5}.editor-form .check-field{display:flex;align-items:center;gap:.55rem;padding:.65rem .7rem;border:1px solid #e2e7e0;border-radius:7px;background:#fbfcfa}.check-field input{width:16px;height:16px;accent-color:#315643}.form-actions{display:grid;gap:.5rem;margin-top:.15rem}.cover-preview-card{overflow:hidden;padding:.65rem;border:1px solid #e2e7e0;border-radius:9px;background:#f8faf6}.cover-preview-label{display:flex;align-items:center;gap:.4rem;margin-bottom:.55rem;color:#48594c;font-size:.61rem;font-weight:800;letter-spacing:.05em}.cover-preview-card :deep(.cover-art){min-height:0;aspect-ratio:1.62;border-radius:6px}.cover-preview-card p{margin:.5rem .1rem .1rem;color:#838d83;font-size:.57rem;line-height:1.5}
.filters{display:flex;align-items:center;gap:.5rem}.search-wrap{position:relative;display:flex;align-items:center;gap:.4rem;width:220px;min-height:38px;padding:0 .6rem;border:1px solid #dce1da;border-radius:7px;background:#fff;color:#7b867d}.search-wrap input{min-height:36px!important;padding:.4rem 0!important;border:0!important;box-shadow:none!important;font-size:.69rem!important}.filters select{width:155px;min-height:38px;padding:.45rem .58rem;font-size:.68rem}
.table-wrap{overflow:auto;border:1px solid #e7eae4;border-radius:8px}table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:.68rem}th{position:sticky;top:0;z-index:1;background:#f7f8f5;color:#7b867d;font-size:.56rem;text-transform:uppercase;letter-spacing:.08em}td,th{padding:.62rem .62rem;border-top:1px solid #ecefe9}thead th{border-top:0}tbody tr{background:#fff;transition:background .15s ease}tbody tr:hover{background:#fafbf8}td strong,td small{display:block}td small{color:#879087;font-size:.57rem;margin-top:.2rem}.table-cover{display:block;width:82px;overflow:hidden;border-radius:6px;background:#e9e9e2}.table-cover :deep(.cover-art){min-height:0;aspect-ratio:1.55}.article-table-title{min-width:200px}.table-action{display:inline-flex;align-items:center;gap:.35rem;padding:.42rem .6rem;border:1px solid #d9e0d8;border-radius:6px;background:#fff;color:#385240;font-size:.62rem;font-weight:800;cursor:pointer}.table-action:hover{background:#eef4ed}.empty-table{font-size:.75rem;color:#68716b;text-align:center;padding:1rem}
.settings-form{max-width:1000px}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.color-settings{display:flex;align-items:center;flex-wrap:wrap;gap:1rem;padding:1rem 0;border-block:1px solid #e7ebe5}.color-settings h3{width:100%;margin:0;font:600 1rem var(--serif)}.color-settings label{display:flex;align-items:center;gap:.5rem}.color-settings input[type=color]{width:42px;height:36px;padding:.18rem;cursor:pointer}.social-grid{margin-bottom:.3rem}.section-editor{padding-top:1rem;border-top:1px solid #e7ebe5}.section-editor h3{font:600 1rem var(--serif);margin:.2rem 0}.section-row{display:flex;align-items:start;gap:1rem;padding:1rem 0;border-top:1px solid #e7ebe5}.section-fields{display:grid;grid-template-columns:.7fr 1.3fr;gap:1rem;flex:1}.remove-section{border:0;background:none;color:#943f32;font-size:.68rem;font-weight:750;cursor:pointer}.two-column{grid-template-columns:.9fr 1.1fr;align-items:start}.simple-list{display:grid}.simple-list button{display:grid;grid-template-columns:1fr auto;gap:.22rem .7rem;padding:.8rem .7rem;border:0;border-top:1px solid #edf0eb;border-radius:6px;background:#fff;text-align:left;cursor:pointer;transition:background .15s ease}.simple-list button:hover{background:#f7f9f5}.simple-list strong{font:600 .88rem var(--serif);color:#2c352f}.simple-list span,.simple-list small{font-size:.63rem;color:#768077}.simple-list small{grid-column:1/-1}
@media(max-width:1200px){.admin-layout{grid-template-columns:232px minmax(0,1fr)}.recent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-grid{grid-template-columns:1fr}.shortcuts-panel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.3rem .8rem}.shortcuts-panel .panel-heading{grid-column:1/-1}.shortcut-row{align-content:start;border-top:1px solid #edf0eb}}
@media(max-width:900px){.admin-shell{margin:1rem 0 1.5rem;border-radius:13px}.admin-layout{grid-template-columns:200px minmax(0,1fr)}.dashboard-hero{grid-template-columns:1fr}.hero-stat{justify-content:flex-start;max-width:520px}.editor-form{grid-template-columns:1fr}.editor-side{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.cover-preview-card{grid-column:1/-1}.editor-side .form-actions{grid-column:1/-1}.filters{flex-wrap:wrap}.search-wrap{flex:1;min-width:180px}}
@media(max-width:700px){.admin-shell{margin:.65rem 0 1rem;border-radius:10px}.admin-layout{display:block}.admin-sidebar{position:static;height:auto;min-height:0;max-height:none;padding:.75rem .75rem .55rem}.admin-wordmark{padding:.1rem .25rem .65rem}.admin-mark{width:34px;height:34px}.brand-copy strong{font-size:1rem}.sidebar-caption{display:none}.admin-sidebar nav{display:flex;gap:.25rem;overflow-x:auto;padding-bottom:.2rem}.admin-sidebar nav button{flex:none;width:auto;white-space:nowrap;padding:.55rem .62rem;font-size:.65rem}.admin-sidebar nav button svg{width:15px;height:15px}.nav-indicator{display:none}.sidebar-bottom{grid-template-columns:30px 1fr 30px;margin-top:.5rem;padding:.5rem .2rem 0}.user-avatar{width:29px;height:29px}.admin-main{padding:.85rem .75rem 1.4rem}.admin-top{align-items:flex-start;padding-bottom:.85rem;margin-bottom:.9rem}.admin-top h1{font-size:1.45rem}.admin-top-actions{flex-direction:column;align-items:flex-end;gap:.35rem}.portal-link,.refresh-button{min-height:32px;padding:.4rem .5rem;font-size:.6rem}.admin-content{gap:.8rem}.dashboard-hero{padding:1rem;gap:.9rem}.hero-copy h2{font-size:1.75rem}.hero-copy p{font-size:.7rem}.hero-actions{gap:.4rem}.hero-actions button{min-height:38px;padding:.55rem .65rem;font-size:.65rem}.hero-stat{gap:.8rem;padding:.72rem}.stat-orbit{width:76px;height:76px;border-width:5px}.stat-orbit strong{font-size:1.35rem}.hero-stat-copy small{font-size:.54rem}.metric-grid{gap:.45rem}.metric-card{grid-template-columns:32px minmax(0,1fr) 12px;gap:.45rem;padding:.65rem}.metric-icon{width:31px;height:31px;border-radius:8px}.metric-icon svg{width:16px;height:16px}.metric-copy small{font-size:.56rem}.metric-copy strong{font-size:1.25rem}.metric-copy>span{font-size:.5rem}.metric-arrow{width:13px}.admin-panel{padding:.85rem;border-radius:9px}.panel-heading{align-items:flex-start;flex-wrap:wrap;gap:.5rem}.panel-heading h2{font-size:1.05rem}.panel-heading p{font-size:.64rem}.workflow-track{grid-template-columns:repeat(2,minmax(0,1fr))}.shortcuts-panel{display:block}.shortcut-row{grid-template-columns:33px minmax(0,1fr) 15px}.shortcut-icon{width:31px;height:31px}.shortcut-row strong{font-size:.62rem}.shortcut-row small{font-size:.52rem}.recent-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}.recent-card-copy{padding:.55rem}.recent-card-meta{font-size:.48rem}.recent-title{font-size:.67rem}.recent-author{font-size:.51rem}.editor-main{grid-template-columns:1fr}.editor-main>label{grid-column:1!important}.editor-side{grid-template-columns:1fr}.cover-preview-card,.editor-side .form-actions{grid-column:auto}.filters{width:100%;flex-direction:column;align-items:stretch}.search-wrap{width:100%}.filters select{width:100%}.section-fields,.settings-grid,.two-column{grid-template-columns:1fr}.section-row{display:block}.remove-section{margin-top:.55rem}.login-card{padding:1.45rem}.back-link{left:1rem;top:1rem}.login-wrap{min-height:620px;padding:1rem}.table-cover{width:60px}.table-wrap{max-width:calc(100vw - 42px)}}
@media(prefers-reduced-motion:reduce){.admin-shell *, .admin-shell *::before, .admin-shell *::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>
