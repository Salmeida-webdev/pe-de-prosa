<script setup lang="ts">
import { localFeed, localCategories, portalFetch, type Story } from '~/composables/usePortal'
const data = await portalFetch('/articles?limit=18', localFeed({ pageSize: 18 }))
const stories = (data as any).articles as Story[]
const lead = stories.find(item => item.featured) || stories[0]
const side = stories.filter(item => item.id !== lead?.id).slice(0, 2)
const latest = stories.filter(item => item.id !== lead?.id && !side.some(row => row.id === item.id)).slice(0, 9)
const categoryData = await portalFetch('/categories', { categories: localCategories }) as any
useSeoMeta({ title: 'Pé de Prosa — histórias, ideias e bons encontros', description: 'Uma publicação editorial brasileira sobre cidade, cultura, comida, sociedade, trabalho e natureza.', ogTitle: 'Pé de Prosa', ogDescription: 'Conteúdo que rende conversa.' })
</script>

<template>
  <div class="container home-page">
    <div class="edition-line"><span>Edição do dia</span><span>Leitura para acompanhar o dia</span><a href="/feed.xml">Assine o RSS <span aria-hidden="true">↗</span></a></div>
    <section class="lead-grid" aria-labelledby="destaque-titulo">
      <article v-if="lead" class="lead-story">
        <NuxtLink :to="`/artigo/${lead.slug}`" class="lead-image"><ArticleArtwork :article="lead" /></NuxtLink>
        <div class="lead-copy"><NuxtLink class="eyebrow" :to="`/categoria/${lead.category_slug}`">{{ lead.category_name }}</NuxtLink><h1 id="destaque-titulo" class="headline"><NuxtLink :to="`/artigo/${lead.slug}`">{{ lead.title }}</NuxtLink></h1><p>{{ lead.excerpt }}</p><div class="metadata"><span>Por <NuxtLink :to="`/autor/${lead.author_slug}`">{{ lead.author_name }}</NuxtLink></span><span class="dot">•</span><time>{{ lead.reading_minutes }} min de leitura</time></div><NuxtLink class="read-more" :to="`/artigo/${lead.slug}`">Leia o texto <span aria-hidden="true">→</span></NuxtLink></div>
      </article>
      <aside class="lead-aside" aria-label="Outros destaques"><div class="aside-title"><span class="section-kicker">Para começar</span><span>03 chamadas</span></div><ArticleCard v-for="article in side" :key="article.id" :article="article" compact /></aside>
    </section>

    <section class="category-strip" aria-label="Editorias"><div class="strip-title">Leia por assunto</div><NuxtLink v-for="category in categoryData.categories" :key="category.id" :to="`/categoria/${category.slug}`"><span>{{ category.name }}</span><small>{{ category.article_count }} textos</small></NuxtLink></section>

    <section class="latest-section" aria-labelledby="recentes-titulo"><div class="section-heading"><div><span class="section-kicker">Da redação</span><h2 id="recentes-titulo">Leituras recentes</h2></div><NuxtLink class="text-link" to="/busca">Ver o acervo completo →</NuxtLink></div><div class="article-grid"><ArticleCard v-for="article in latest" :key="article.id" :article="article" /></div></section>

    <section class="authors-note"><div><span class="section-kicker">A publicação</span><h2>Uma boa prosa começa prestando atenção.</h2><p>Pé de Prosa reúne histórias, ideias e observações sobre a vida brasileira. Cada texto nasce de uma pergunta e ganha corpo com contexto, escuta e curiosidade.</p><NuxtLink class="button secondary" to="/sobre">Conheça o Pé de Prosa</NuxtLink></div><img src="/images/brand-jabuticaba.png" alt="Ilustração de uma jabuticabeira que cresce de um livro aberto" width="360" height="330" loading="lazy"></section>
  </div>
</template>

<style scoped>
.home-page{padding-bottom:1rem}.edition-line{display:flex;justify-content:space-between;padding:.8rem 0;color:var(--muted);font-size:.68rem;border-bottom:1px solid var(--line);letter-spacing:.04em}.lead-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(280px,.85fr);gap:2.2rem;padding:1.4rem 0 2rem;border-bottom:1px solid var(--ink)}.lead-story{display:grid;grid-template-columns:1.08fr .92fr;gap:1.5rem;align-items:center}.lead-image :deep(.cover-art){aspect-ratio:1.13;min-height:320px}.lead-copy h1{font-size:clamp(2rem,4vw,3.45rem);margin:.55rem 0 .8rem}.lead-copy p{font:1.03rem/1.5 var(--serif);color:#56564f}.read-more{display:inline-flex;margin-top:1rem;align-items:center;gap:.55rem;color:var(--forest);font-weight:700}.lead-aside{border-left:1px solid var(--line);padding-left:1.3rem;display:flex;flex-direction:column;gap:1.2rem}.aside-title{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:.55rem}.aside-title span:last-child{font-size:.68rem;color:var(--muted)}.category-strip{display:grid;grid-template-columns:1.1fr repeat(3,1fr);border-bottom:1px solid var(--line);padding:1rem 0;gap:.4rem 1rem}.strip-title{font:600 1.1rem var(--serif);align-self:center}.category-strip a{display:flex;justify-content:space-between;gap:.5rem;align-items:center;padding:.45rem 0;border-bottom:1px solid var(--line);font-size:.78rem;font-weight:700}.category-strip small{color:var(--muted);font-size:.65rem;font-weight:500;white-space:nowrap}.latest-section{padding:2.4rem 0}.authors-note{display:grid;grid-template-columns:1.2fr .8fr;align-items:center;gap:2rem;background:#e9e4d8;padding:1.6rem 2rem;margin:1rem 0}.authors-note h2{font:600 clamp(1.8rem,3.5vw,2.75rem)/1.1 var(--serif);letter-spacing:-.04em;margin:.4rem 0}.authors-note p{color:#585951;max-width:570px}.authors-note img{width:min(100%,340px);max-height:280px;object-fit:contain;justify-self:center}
@media(max-width:900px){.lead-grid{grid-template-columns:1fr}.lead-aside{border-left:0;padding:1.2rem 0 0;border-top:1px solid var(--line)}.lead-aside :deep(.article-card){grid-template-columns:100px 1fr}.category-strip{grid-template-columns:repeat(2,1fr)}.strip-title{grid-column:1/-1}.lead-image :deep(.cover-art){min-height:250px}}
@media(max-width:600px){.edition-line span:last-child{display:none}.lead-story{grid-template-columns:1fr}.lead-image :deep(.cover-art){aspect-ratio:1.45}.lead-copy h1{font-size:2.2rem}.category-strip{gap:.2rem .8rem}.category-strip a{font-size:.68rem;align-items:start;flex-direction:column;gap:0}.authors-note{grid-template-columns:1fr;padding:1.3rem}.authors-note img{max-height:220px;order:-1}}
</style>
