<script setup lang="ts">
import { localCategories, portalFetch, usePortalSettings } from '~/composables/usePortal'
const route = useRoute()
const open = ref(false)
const settings = usePortalSettings()
const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date())
const categoryData = await portalFetch('/categories', { categories: localCategories }) as any
const links = computed(() => categoryData.categories.map((item: any) => ({ label: item.name, to: `/categoria/${item.slug}` })))
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="masthead">
    <div class="container">
      <div class="masthead-top"><span>{{ settings.mastheadTopLine }}</span><time :datetime="new Date().toISOString().slice(0,10)">{{ today }}</time><NuxtLink to="/busca">Buscar no acervo <span aria-hidden="true">⌕</span></NuxtLink></div>
      <div class="masthead-main">
        <button class="menu-toggle" type="button" :aria-expanded="open" aria-controls="editorias" @click="open = !open">{{ open ? 'Fechar menu' : 'Editorias' }}</button>
        <NuxtLink class="brand" to="/" :aria-label="`${settings.siteName} — início`"><strong>{{ settings.siteName }}</strong><small>{{ settings.tagline }}</small></NuxtLink>
        <NuxtLink class="about-link" to="/sobre">Sobre o portal</NuxtLink>
      </div>
      <nav id="editorias" class="editorial-nav" :class="{ open }" aria-label="Editorias">
        <NuxtLink to="/">Últimas</NuxtLink>
        <NuxtLink v-for="item in links" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
        <NuxtLink to="/assuntos">Assuntos</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.masthead{position:relative;z-index:20;border-bottom:2px solid var(--ink);background:var(--paper)}.masthead-top{height:33px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);font-size:.63rem;letter-spacing:.035em;color:var(--muted)}.masthead-top a{font-weight:700;color:var(--ink)}.masthead-main{min-height:112px;display:flex;align-items:center;justify-content:center;position:relative}.brand{text-align:center;display:flex;flex-direction:column;align-items:center}.brand strong{font:700 clamp(2.7rem,6vw,4.25rem)/.9 var(--serif);letter-spacing:-.075em;color:var(--ink)}.brand small{display:block;margin-top:.6rem;font-size:.59rem;letter-spacing:.2em;text-transform:uppercase;color:var(--rust);font-weight:700}.about-link{position:absolute;right:0;font-size:.75rem;font-weight:700}.editorial-nav{display:flex;align-items:center;justify-content:center;gap:clamp(1rem,3vw,2.4rem);min-height:42px;border-top:1px solid var(--line);white-space:nowrap}.editorial-nav a{font-size:.71rem;font-weight:700;letter-spacing:.045em;text-transform:uppercase;color:#393d3a}.editorial-nav a:first-child{color:var(--rust)}.menu-toggle{display:none}
@media(max-width:850px){.masthead-main{min-height:96px}.brand strong{font-size:3rem}.about-link{right:0;display:inline-flex;min-height:44px;align-items:center;padding:.4rem .2rem}.menu-toggle{display:inline-flex;position:absolute;left:0;min-height:44px;align-items:center;padding:.45rem .2rem;border:0;background:none;color:var(--ink);font-size:.69rem;font-weight:700;text-transform:uppercase;cursor:pointer}.editorial-nav{display:none;position:absolute;z-index:30;left:0;right:0;top:100%;box-shadow:var(--shadow);background:var(--white);padding:1rem;white-space:normal;flex-wrap:wrap;justify-content:flex-start}.editorial-nav.open{display:flex}.editorial-nav a{width:calc(33% - 1rem)}}
@media(max-width:520px){.masthead-top span{display:none}.masthead-top{height:31px}.masthead-main{min-height:82px}.brand{margin-left:1.4rem}.brand strong{font-size:2.35rem}.brand small{font-size:.5rem;letter-spacing:.12em}.about-link{font-size:.61rem}.editorial-nav a{width:calc(50% - .5rem)}}
@media(max-width:380px){.menu-toggle{font-size:.58rem}.brand{margin-left:0;max-width:calc(100vw - 130px)}.brand strong{font-size:1.85rem;white-space:nowrap}.brand small{max-width:100%;font-size:.43rem;letter-spacing:.07em;white-space:nowrap}.about-link{font-size:.58rem}}
</style>
