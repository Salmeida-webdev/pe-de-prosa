<script setup lang="ts">
import { byTag, localFeed, localTags, portalFetch } from '~/composables/usePortal'
const route = useRoute(); const slug = computed(() => String(route.params.slug))
const localTag = computed(() => byTag(slug.value)); const tag = await portalFetch(`/tags/${slug.value}`, localTag.value)
if (!tag) throw createError({ statusCode: 404, statusMessage: 'Assunto não encontrado' })
const routePage = computed(() => Math.max(1, Number(route.query.page || 1)))
const { data: listing } = await useAsyncData(`tag-${slug.value}`, () => portalFetch(`/articles?tag=${slug.value}&page=${routePage.value}&limit=12`, localFeed({ tag: slug.value, page: routePage.value, pageSize: 12 })), { watch: [routePage] })
const data = computed(() => listing.value as any || localFeed({ tag: slug.value, page: routePage.value, pageSize: 12 }))
useSeoMeta({ title: `Textos sobre ${(tag as any).name}`, description: `Reportagens e textos sobre ${(tag as any).name}.` })
</script>

<template><div class="container"><header class="page-intro"><span class="eyebrow">Assunto</span><h1>#{{ (tag as any).name }}</h1><p>Reportagens, ideias e leituras relacionadas a este tema.</p><div class="subline">{{ data.total }} textos relacionados</div></header><section class="listing"><div class="article-grid"><ArticleCard v-for="(article,index) in data.articles" :key="article.id" :article="article" :variant="Number(index)" /></div><p v-if="!data.articles.length" class="empty-state">Ainda não há textos publicados com esta tag.</p><PortalPagination :current="data.page" :total="data.totalPages" :path="`/tag/${slug}`" /></section></div></template>
<style scoped>.subline{margin-top:.9rem;font-size:.75rem;color:var(--muted)}.listing{padding-top:1.7rem}</style>
