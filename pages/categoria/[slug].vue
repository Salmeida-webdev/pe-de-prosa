<script setup lang="ts">
import { byCategory, localFeed, localCategories, portalFetch } from '~/composables/usePortal'
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const localCategory = computed(() => byCategory(slug.value))
const category = await portalFetch(`/categories/${slug.value}`, localCategory.value)
if (!category) throw createError({ statusCode: 404, statusMessage: 'Editoria não encontrada' })
const routePage = computed(() => Math.max(1, Number(route.query.page || 1)))
const { data: listing } = await useAsyncData(`category-${slug.value}`, () => portalFetch(`/articles?category=${slug.value}&page=${routePage.value}&limit=12`, localFeed({ category: slug.value, page: routePage.value, pageSize: 12 })), { watch: [routePage] })
const data = computed(() => listing.value as any || localFeed({ category: slug.value, page: routePage.value, pageSize: 12 }))
const cat = category as any
useSeoMeta({ title: cat.name, description: cat.description, ogTitle: `${cat.name} | Pé de Prosa`, ogDescription: cat.description })
</script>

<template>
  <div class="container">
    <header class="page-intro"><span class="eyebrow">Editoria</span><h1>{{ cat.name }}</h1><p>{{ cat.description }}</p><div class="subline">{{ data.total }} textos no acervo</div></header>
    <section class="listing"><div class="article-grid"><ArticleCard v-for="article in data.articles" :key="article.id" :article="article" /></div><p v-if="!data.articles.length" class="empty-state">Ainda não há textos publicados nesta editoria.</p><PortalPagination :current="data.page" :total="data.totalPages" :path="`/categoria/${slug}`" /></section>
  </div>
</template>

<style scoped>.subline{margin-top:.9rem;font-size:.75rem;color:var(--muted)}.listing{padding-top:1.7rem}</style>
