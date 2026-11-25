<script setup lang="ts">
useHead({
  titleTemplate: (title) => title ? `${title} | Pé de Prosa` : 'Pé de Prosa',
  meta: [{ name: 'color-scheme', content: 'light' }]
})
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <SiteHeader />
    <main id="conteudo"><NuxtPage /></main>
    <SiteFooter />
  </div>
</template>
