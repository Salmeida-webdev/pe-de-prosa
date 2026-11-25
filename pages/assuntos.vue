<script setup lang="ts">
import { localTags } from '~/composables/usePortal'
const tags = localTags.filter(tag => tag.article_count > 0).sort((a,b) => b.article_count-a.article_count || a.name.localeCompare(b.name,'pt-BR'))
useSeoMeta({ title: 'Assuntos', description: 'Explore os principais assuntos e temas do acervo do Pé de Prosa.' })
</script>

<template>
  <div class="container topics-page">
    <header class="page-intro"><span class="eyebrow">Índice temático</span><h1>Assuntos para continuar a conversa</h1><p>Explore o acervo pelas ideias, lugares e práticas que atravessam os textos.</p></header>
    <section class="topic-cloud" aria-label="Lista de assuntos">
      <NuxtLink v-for="tag in tags" :key="tag.slug" :to="`/tag/${tag.slug}`" class="topic-link"><span># {{ tag.name }}</span><small>{{ tag.article_count }} {{ tag.article_count === 1 ? 'texto' : 'textos' }}</small></NuxtLink>
    </section>
    <p v-if="!tags.length" class="empty-state">Os assuntos aparecerão aqui conforme novos textos forem publicados.</p>
  </div>
</template>

<style scoped>
.topics-page{padding-bottom:2rem}.topic-cloud{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;padding:2rem 0}.topic-link{display:flex;justify-content:space-between;gap:.6rem;align-items:center;padding:1rem;border:1px solid var(--line);background:var(--white);font:600 1.05rem var(--serif)}.topic-link:hover{border-color:var(--forest);text-decoration:none}.topic-link small{font:500 .72rem var(--sans);color:var(--muted);white-space:nowrap}@media(max-width:700px){.topic-cloud{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.topic-cloud{grid-template-columns:1fr}}
</style>
