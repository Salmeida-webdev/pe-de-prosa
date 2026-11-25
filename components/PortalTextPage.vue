<script setup lang="ts">
defineProps<{ page: { title: string; summary: string; sections: Array<{ heading: string; body: string }> }; eyebrow?: string }>()
</script>

<template>
  <div class="container text-page">
    <header class="page-intro"><span class="eyebrow">{{ eyebrow || 'Pé de Prosa' }}</span><h1>{{ page.title }}</h1><p>{{ page.summary }}</p></header>
    <article class="policy-copy"><section v-for="(section,index) in page.sections" :key="index"><h2>{{ section.heading }}</h2><p>{{ section.body }}</p></section></article>
  </div>
</template>

<style scoped>
.text-page{padding-bottom:3rem}.policy-copy{max-width:760px;margin:2rem auto;font:1.04rem/1.85 var(--serif)}.policy-copy section{padding:1.15rem 0;border-bottom:1px solid var(--line)}.policy-copy h2{font:600 1.4rem/1.25 var(--serif);margin:.2rem 0 .6rem}.policy-copy p{margin:0;color:#4c514d}
</style>
