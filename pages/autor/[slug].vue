<script setup lang="ts">
import { byAuthor, localAuthors, localStories, portalFetch } from '~/composables/usePortal'
const route=useRoute(); const slug=computed(()=>String(route.params.slug)); const localAuthor=computed(()=>byAuthor(slug.value)); const author=await portalFetch(`/authors/${slug.value}`,localAuthor.value)
if(!author) throw createError({statusCode:404,statusMessage:'Autoria não encontrada'})
const fallback={articles:localStories.filter(item=>item.author_slug===slug.value&&item.status==='published'),total:localStories.filter(item=>item.author_slug===slug.value&&item.status==='published').length}
const data=await portalFetch(`/authors/${slug.value}/articles`,fallback) as any
const profile=author as any
useSeoMeta({title:profile.name,description:profile.bio,ogTitle:`${profile.name} | Pé de Prosa`,ogDescription:profile.bio})
</script>

<template><div class="container"><header class="author-head"><div class="author-mark" aria-hidden="true">{{ profile.name.split(' ').map((n:string)=>n[0]).slice(0,2).join('') }}</div><div><span class="eyebrow">{{ profile.role }}</span><h1>{{ profile.name }}</h1><p class="location">{{ profile.location }}</p><p class="bio">{{ profile.bio }}</p></div></header><section class="listing"><div class="section-heading"><div><span class="section-kicker">Arquivo de autoria</span><h2>Textos publicados</h2></div><span class="count">{{ data.total }} textos</span></div><div class="article-grid"><ArticleCard v-for="article in data.articles" :key="article.id" :article="article" /></div></section></div></template>
<style scoped>.author-head{display:grid;grid-template-columns:150px 1fr;gap:2rem;align-items:center;padding:3rem 0;border-bottom:1px solid var(--line)}.author-mark{width:136px;height:136px;border-radius:50%;display:grid;place-items:center;background:var(--forest);color:#f4ead4;font:600 2.5rem var(--serif)}.author-head h1{font:600 clamp(2rem,5vw,3.7rem)/1 var(--serif);letter-spacing:-.05em;margin:.4rem 0}.location,.count{font-size:.78rem;color:var(--muted)}.bio{max-width:650px}.listing{padding-top:2rem}@media(max-width:600px){.author-head{grid-template-columns:80px 1fr;gap:1rem;padding:2rem 0}.author-mark{width:76px;height:76px;font-size:1.5rem}}</style>
