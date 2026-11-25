<script setup lang="ts">
import { localFeed, localCategories, portalFetch, type Story } from '~/composables/usePortal'

const data = await portalFetch('/articles?limit=24', localFeed({ pageSize: 24 })) as any
const settings = usePortalSettings()
const stories = data.articles as Story[]
const lead = stories.find(item => item.featured) || stories[0]
const side = stories.filter(item => item.id !== lead?.id).slice(0, 3)
const featuredIds = new Set([lead?.id, ...side.map(item => item.id)])
const latest = stories.filter(item => !featuredIds.has(item.id))
const categoryData = await portalFetch('/categories', { categories: localCategories }) as any

useSeoMeta({ title: settings.value.siteName, description: settings.value.footerDescription, ogTitle: settings.value.siteName, ogDescription: settings.value.tagline })
</script>

<template>
  <div class="container home-page">
    <div class="edition-line"><span>Publicação independente</span><time>{{ new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date()) }}</time><NuxtLink to="/assuntos">Explore as editorias <span aria-hidden="true">→</span></NuxtLink></div>
    <section class="lead-grid" aria-labelledby="destaque-titulo">
      <article v-if="lead" class="lead-story">
        <NuxtLink :to="`/artigo/${lead.slug}`" class="lead-image"><ArticleArtwork :article="lead" priority /></NuxtLink>
        <div class="lead-copy"><NuxtLink class="eyebrow" :to="`/categoria/${lead.category_slug}`">{{ lead.category_name }}</NuxtLink><h1 id="destaque-titulo" class="headline"><NuxtLink :to="`/artigo/${lead.slug}`">{{ lead.title }}</NuxtLink></h1><p>{{ lead.excerpt }}</p><div class="metadata"><span>Por <NuxtLink :to="`/autor/${lead.author_slug}`">{{ lead.author_name }}</NuxtLink></span><span class="dot">•</span><time>{{ lead.reading_minutes }} min de leitura</time></div><NuxtLink class="read-more" :to="`/artigo/${lead.slug}`">Leia a matéria <span aria-hidden="true">→</span></NuxtLink></div>
      </article>
      <aside class="lead-aside" aria-label="Mais destaques"><div class="aside-title"><span class="section-kicker">Em destaque</span><NuxtLink to="/busca">Ver acervo →</NuxtLink></div><ArticleCard v-for="(article,index) in side" :key="article.id" :article="article" :variant="Number(index)" compact /></aside>
    </section>

    <nav class="category-strip" aria-label="Editorias"><NuxtLink v-for="category in categoryData.categories" :key="category.id" :to="`/categoria/${category.slug}`"><span>{{ category.name }}</span><small>{{ category.article_count }} textos</small></NuxtLink></nav>

    <section class="latest-section" aria-labelledby="recentes-titulo"><div class="section-heading"><div><span class="section-kicker">No {{ settings.siteName }}</span><h2 id="recentes-titulo">{{ settings.homepageTitle }}</h2><p class="section-dek">{{ settings.homepageDescription }}</p></div><NuxtLink class="text-link" to="/busca">Acessar todo o acervo →</NuxtLink></div><div class="article-grid"><ArticleCard v-for="(article,index) in latest" :key="article.id" :article="article" :variant="Number(index)" /></div></section>

    <section class="about-band"><div><span class="section-kicker">{{ settings.siteName }}</span><h2>{{ settings.aboutTitle }}</h2><p>{{ settings.aboutDescription }}</p><NuxtLink class="button secondary" to="/sobre">Conheça a publicação</NuxtLink></div><div class="about-photo" role="img" aria-label="Livros em uma biblioteca de bairro"></div></section>
  </div>
</template>

<style scoped>
.home-page{padding-bottom:1rem}.edition-line{display:flex;justify-content:space-between;align-items:center;padding:.68rem 0;color:var(--muted);font-size:.64rem;border-bottom:1px solid var(--line);letter-spacing:.035em}.edition-line span{font-weight:700;color:var(--ink);text-transform:uppercase;letter-spacing:.1em}.edition-line a{font-weight:700;color:var(--ink)}.lead-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(280px,.8fr);gap:2rem;padding:1.5rem 0 2rem;border-bottom:1px solid var(--ink)}.lead-story{display:grid;grid-template-columns:1.15fr .85fr;gap:1.5rem;align-items:center}.lead-image :deep(.cover-art){aspect-ratio:1.48;min-height:380px}.lead-copy h1{font-size:clamp(2.1rem,4vw,3.65rem);margin:.55rem 0 .8rem}.lead-copy p{font:1rem/1.55 var(--serif);color:#505650}.read-more{display:inline-flex;margin-top:.9rem;align-items:center;gap:.55rem;color:var(--rust);font-size:.8rem;font-weight:700}.lead-aside{border-left:1px solid var(--line);padding-left:1.25rem;display:flex;flex-direction:column;gap:1rem}.aside-title{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding:0 0 .55rem}.aside-title a{font-size:.68rem;font-weight:700;color:var(--ink)}.category-strip{display:flex;justify-content:space-between;gap:1.1rem;border-bottom:1px solid var(--line);padding:.8rem 0;overflow:auto}.category-strip a{display:flex;flex-direction:column;gap:.15rem;min-width:max-content;font-size:.75rem;font-weight:700}.category-strip small{font-size:.61rem;color:var(--muted);font-weight:500}.latest-section{padding:2.3rem 0}.section-dek{margin:.35rem 0 0;color:var(--muted);font-size:.82rem}.about-band{display:grid;grid-template-columns:1fr .82fr;gap:2rem;align-items:center;background:var(--paper-deep);padding:1.6rem 1.8rem;margin:.5rem 0}.about-band h2{font:600 clamp(1.8rem,3.2vw,2.7rem)/1.11 var(--serif);letter-spacing:-.04em;margin:.4rem 0}.about-band p{color:#565b57;max-width:540px}.about-photo{background:url('/images/editorial/community-library.webp') no-repeat center/cover;aspect-ratio:1.6;min-height:230px}
@media(max-width:900px){.lead-grid{grid-template-columns:minmax(0,1fr)}.lead-aside{border-left:0;padding:1rem 0 0;border-top:1px solid var(--line)}.lead-aside :deep(.article-card){grid-template-columns:130px 1fr}.lead-image :deep(.cover-art){min-height:300px}}
@media(max-width:600px){.edition-line{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem .8rem;align-items:center}.edition-line>span{grid-column:1/-1;font-size:.58rem}.edition-line time{display:block;font-size:.58rem}.edition-line>a{font-size:.63rem;text-align:right;white-space:nowrap}.lead-story{min-width:0;grid-template-columns:minmax(0,1fr);gap:1rem}.lead-image,.lead-copy{min-width:0}.lead-image :deep(.cover-art){aspect-ratio:1.5;min-height:0}.lead-copy h1{font-size:2.25rem}.category-strip{justify-content:flex-start}.about-band{grid-template-columns:1fr;padding:1.2rem}.about-photo{order:-1;min-height:190px}}
</style>
