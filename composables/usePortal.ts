import seed from '~/data/seed.json'
import additionalStories from '~/data/additional-stories.json'

type SeedStory = typeof seed.articles[number] | typeof additionalStories[number]
export type Story = Omit<SeedStory, 'cover' | 'alt' | 'status'> & {
  cover?: string; alt?: string; status: string; alt_text?: string
  category_name?: string; category_slug?: string; author_name?: string; author_slug?: string; reading_minutes?: number; published_at?: string
}

export const defaultSiteSettings = {
  siteName: 'Pé de Prosa', tagline: 'Jornalismo, cultura e vida brasileira', mastheadTopLine: 'Jornalismo, cultura e vida brasileira',
  footerDescription: 'Reportagens, ensaios e histórias para compreender o Brasil com contexto e curiosidade.', footerSubline: 'Uma publicação editorial independente',
  homepageTitle: 'Histórias para ler com calma', homepageDescription: 'Novos olhares sobre o cotidiano, a cultura e as transformações do país.',
  aboutTitle: 'Uma publicação feita para olhar mais de perto.', aboutDescription: 'Reportagens, ensaios e histórias que ajudam a conectar experiências, ideias e lugares do Brasil.',
  theme: { paper: '#fffefa', ink: '#171a18', accent: '#9d382a', forest: '#263b35' },
  social: { instagram: '', facebook: '', youtube: '' }
}

export const defaultPortalPages = {
  sobre: { slug: 'sobre', title: 'Sobre a publicação', summary: 'Conheça a proposta editorial do Pé de Prosa.', sections: [{ heading: 'Contexto antes do ruído.', body: 'O Pé de Prosa é uma publicação editorial brasileira dedicada a histórias, ideias e observações sobre a vida em comum. Escolhemos temas que ajudam a entender o cotidiano, as mudanças nas cidades e as perguntas que atravessam a sociedade.' }, { heading: 'Clareza, contexto e escuta', body: 'Cada texto procura explicar o que está em jogo sem perder a clareza nem a curiosidade. Reportagens, ensaios e opiniões devem ter autoria e abordagem identificadas, com espaço para correções quando necessárias.' }] },
  'politica-editorial': { slug: 'politica-editorial', title: 'Política editorial', summary: 'Os critérios que orientam a seleção, a edição e a apresentação dos textos.', sections: [{ heading: 'Clareza e contexto', body: 'A edição procura preservar nuances, explicar termos e deixar claro o que é observação, interpretação ou opinião.' }, { heading: 'Autoria identificada', body: 'Os textos devem ter autoria e editoria identificadas. Edição e revisão podem propor ajustes sem apagar a responsabilidade de quem assina.' }, { heading: 'Correções', body: 'Quando um erro é identificado, a correção deve ser feita com rapidez e de forma proporcional. Alterações relevantes precisam explicar o que mudou.' }] },
  privacidade: { slug: 'privacidade', title: 'Privacidade', summary: 'Como o portal trata dados de navegação e informações pessoais.', sections: [{ heading: 'Leitura sem cadastro', body: 'O acervo público pode ser consultado sem criar uma conta. O portal não oferece comentários nem publicidade comportamental.' }, { heading: 'Dados técnicos', body: 'Provedores de infraestrutura podem processar registros técnicos para entregar as páginas, prevenir abuso e manter a segurança do serviço.' }, { heading: 'Links externos', body: 'Links para outros sites são destinos externos; as práticas desses serviços são responsabilidade de cada operador.' }] }
}

const categories = seed.categories
const authors = seed.authors
const tagSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')

export const localStories: Story[] = [...seed.articles, ...additionalStories].map((story) => {
  const category = categories.find(item => item.id === story.category)
  const author = authors.find(item => item.id === story.author)
  const words = story.body.join(' ').trim().split(/\s+/).filter(Boolean).length
  return { ...story, alt_text: String(('alt' in story ? story.alt : '') || `Fotografia editorial relacionada à matéria: ${story.title}`), category_name: category?.name, category_slug: category?.slug, author_name: author?.name, author_slug: author?.slug, reading_minutes: Math.max(1, Math.ceil(words / 200)), published_at: story.date }
})

// Keep the offline fallback in the same stable order returned by the API.
// This prevents a hydration reorder from pairing a category label with another slug.
export const localCategories = categories
  .map(category => ({ ...category, article_count: localStories.filter(story => story.category === category.id && story.status === 'published').length }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
export const localAuthors = authors.map(author => ({ ...author, article_count: localStories.filter(story => story.author === author.id && story.status === 'published').length }))
export const localTags = seed.tags.map(name => ({ name, slug: tagSlug(name), article_count: localStories.filter(story => story.status === 'published' && story.tags.includes(name)).length }))

export async function portalFetch<T>(path: string, fallback: T): Promise<T> {
  const config = useRuntimeConfig()
  try {
    return await $fetch<T>(`${String(config.public.apiBase).replace(/\/$/, '')}${path}`)
  } catch {
    return fallback
  }
}

export function usePortalSettings() {
  return useState('portal-settings', () => ({ ...defaultSiteSettings }))
}

export function localFeed(input: { q?: string; category?: string; tag?: string; page?: number; pageSize?: number } = {}) {
  const q = (input.q || '').trim().toLocaleLowerCase('pt-BR')
  const requestedPage = Math.max(1, Number(input.page || 1))
  const pageSize = Math.max(1, Number(input.pageSize || 9))
  const rows = localStories.filter((story) => {
    const category = categories.find(item => item.id === story.category)
    const searchText = `${story.title} ${story.excerpt} ${story.body.join(' ')} ${story.author_name} ${category?.name} ${story.tags.join(' ')}`.toLocaleLowerCase('pt-BR')
    return story.status === 'published' && (!input.category || category?.slug === input.category) && (!input.tag || story.tags.some(tag => tagSlug(tag) === input.tag)) && (!q || searchText.includes(q))
  })
  rows.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || String(b.published_at).localeCompare(String(a.published_at)))
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const start = (page - 1) * pageSize
  return { articles: rows.slice(start, start + pageSize), total: rows.length, page, pageSize, totalPages }
}

export function byCategory(slug: string) { return localCategories.find(item => item.slug === slug) }
export function byAuthor(slug: string) { return localAuthors.find(item => item.slug === slug) }
export function byTag(slug: string) { return localTags.find(item => item.slug === slug) }
export function localArticle(slug: string) { return localStories.find(item => item.slug === slug && item.status === 'published') }
