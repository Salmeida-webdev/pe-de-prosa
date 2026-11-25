<script setup lang="ts">
import { defaultSiteSettings, portalFetch, usePortalSettings } from '~/composables/usePortal'
const settings = usePortalSettings()
settings.value = await portalFetch('/site', defaultSiteSettings)
useHead({
  titleTemplate: (title) => title ? `${title} | Pé de Prosa` : 'Pé de Prosa',
  meta: [{ name: 'color-scheme', content: 'light' }, { name: 'theme-color', content: settings.value.theme.paper }]
})
const themeStyle = computed(() => ({ '--paper': settings.value.theme.paper, '--ink': settings.value.theme.ink, '--rust': settings.value.theme.accent, '--forest': settings.value.theme.forest }))
</script>

<template>
  <div class="site-shell" :style="themeStyle">
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <SiteHeader />
    <main id="conteudo"><NuxtPage /></main>
    <SiteFooter />
  </div>
</template>
