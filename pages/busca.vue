<script setup lang="ts">
import { localFeed, localStories, portalFetch } from '~/composables/usePortal'
const route=useRoute(); const q=ref(String(route.query.q||'')); const page=ref(Math.max(1,Number(route.query.page||1)))
watch(()=>route.query.q,value=>{q.value=String(value||'');page.value=1})
watch(()=>route.query.page,value=>{page.value=Math.max(1,Number(value||1))})
const { data, pending }=await useAsyncData('search-'+String(route.query.q||''),async()=>portalFetch(`/articles?q=${encodeURIComponent(q.value)}&page=${page.value}&limit=12`,localFeed({q:q.value,page:page.value,pageSize:12})),{watch:[q,page]})
const results=computed(()=>data.value as any||localFeed({q:q.value,page:page.value,pageSize:12}))
useSeoMeta({title:()=>q.value?`Busca: ${q.value}`:'Busca no acervo',description:'Busque reportagens e textos no acervo do Pé de Prosa.'})
function submit(){page.value=1;navigateTo({path:'/busca',query:q.value?{q:q.value}:undefined})}
</script>

<template><div class="container"><header class="page-intro"><span class="eyebrow">Acervo</span><h1>Buscar no Pé de Prosa</h1><p>Encontre textos por assunto, título, autoria ou palavra-chave.</p><form class="search-form" role="search" @submit.prevent="submit"><label class="sr-only" for="q">O que você procura?</label><input id="q" v-model="q" class="search-input" type="search" placeholder="Digite um assunto, título ou autor"><button class="button">Buscar</button></form></header><section class="results"><div class="section-heading"><h2>{{ pending?'Buscando…':`${results.total} ${results.total===1?'resultado':'resultados'}` }}</h2><span v-if="q" class="query">Busca por “{{ q }}”</span></div><div class="article-grid"><ArticleCard v-for="(article,index) in results.articles" :key="article.id" :article="article" :variant="Number(index)" /></div><p v-if="!pending && !results.articles.length" class="empty-state">Não encontramos textos com esse termo. Tente outro assunto ou navegue pelas editorias.</p><PortalPagination :current="results.page" :total="results.totalPages" path="/busca" :query="q ? { q } : {}" /></section></div></template>
<style scoped>.search-form{display:flex;gap:.6rem;max-width:700px;margin-top:1.25rem}.search-form .search-input{font-size:1rem}.results{padding-top:1.5rem}.results h2{font:600 1.2rem var(--serif)}.query{font-size:.8rem;color:var(--muted)}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:500px){.search-form{flex-direction:column}}</style>
