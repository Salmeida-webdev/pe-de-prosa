<script setup lang="ts">
const props = defineProps<{ current: number; total: number; path: string; query?: Record<string, string | number | undefined> }>()
const pages = computed(() => Array.from({ length: props.total }, (_, index) => index + 1))
const location = (page: number) => ({ path: props.path, query: { ...props.query, page: page > 1 ? page : undefined } })
</script>

<template>
  <nav v-if="total > 1" class="pagination" aria-label="Paginação dos artigos">
    <NuxtLink v-if="current > 1" :to="location(current - 1)" rel="prev" aria-label="Página anterior">← Anterior</NuxtLink>
    <span v-else class="disabled" aria-disabled="true">← Anterior</span>
    <NuxtLink v-for="page in pages" :key="page" :to="location(page)" :class="{ active: page === current }" :aria-current="page === current ? 'page' : undefined" :aria-label="`Página ${page}`">{{ page }}</NuxtLink>
    <NuxtLink v-if="current < total" :to="location(current + 1)" rel="next" aria-label="Próxima página">Próxima →</NuxtLink>
    <span v-else class="disabled" aria-disabled="true">Próxima →</span>
  </nav>
</template>

<style scoped>
.pagination{align-items:center;flex-wrap:wrap}.pagination a,.pagination span{display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:40px}.pagination .disabled{color:#a3a096;border-color:var(--line)}
</style>
