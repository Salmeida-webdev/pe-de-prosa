<script setup lang="ts">
defineProps<{ article: any; compact?: boolean }>()
function formatDate(date?: string) {
  if (!date) return 'Em edição'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date))
}
</script>

<template>
  <article class="article-card" :class="{ compact }">
    <NuxtLink :to="`/artigo/${article.slug}`" :aria-label="`Ler: ${article.title}`">
      <ArticleArtwork :article="article" />
    </NuxtLink>
    <div class="article-copy">
      <NuxtLink class="eyebrow" :to="`/categoria/${article.category_slug}`">{{ article.category_name }}</NuxtLink>
      <h3><NuxtLink :to="`/artigo/${article.slug}`">{{ article.title }}</NuxtLink></h3>
      <p>{{ article.excerpt }}</p>
      <div class="metadata"><span>Por <NuxtLink :to="`/autor/${article.author_slug}`">{{ article.author_name }}</NuxtLink></span><span class="dot">•</span><time :datetime="article.published_at">{{ formatDate(article.published_at) }}</time><span class="dot">•</span><span>{{ article.reading_minutes }} min de leitura</span></div>
    </div>
  </article>
</template>

<style scoped>
.compact{display:grid;grid-template-columns:110px 1fr;gap:.9rem;align-items:start}.compact :deep(.cover-art){min-height:88px;aspect-ratio:1.25}.compact :deep(.article-copy){padding:0}.compact h3{font-size:1.06rem;margin:.2rem 0}.compact p{display:none}.compact .metadata{font-size:.68rem}
</style>
