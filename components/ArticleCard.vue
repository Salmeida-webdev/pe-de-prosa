<script setup lang="ts">
defineProps<{ article: any; compact?: boolean }>()
function formatDate(date?: string) {
  if (!date) return 'Em edição'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date))
}
</script>

<template>
  <article class="article-card" :class="{ compact }">
    <NuxtLink class="article-image-link" :to="`/artigo/${article.slug}`" :aria-label="`Ler: ${article.title}`">
      <ArticleArtwork :article="article" />
      <span class="image-category">{{ article.category_name }}</span>
      <span class="image-arrow" aria-hidden="true">↗</span>
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
.article-card{overflow:hidden;border:1px solid #e2e2db;border-radius:8px;background:#fffefa;box-shadow:0 5px 18px rgba(26,33,29,.045);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
.article-card:hover{transform:translateY(-3px);border-color:#c6c8be;box-shadow:0 14px 30px rgba(26,33,29,.11)}
.article-image-link{position:relative;display:block;overflow:hidden;background:#e8e4d9}
.article-image-link:hover{text-decoration:none}
.article-image-link :deep(.cover-art){min-height:0;aspect-ratio:1.62;transition:transform .35s ease,filter .35s ease}
.article-card:hover .article-image-link :deep(.cover-art){transform:scale(1.035);filter:saturate(1.08)}
.image-category{position:absolute;left:.8rem;bottom:.8rem;padding:.35rem .55rem;border:1px solid #ffffff8c;border-radius:3px;background:#fffefaed;color:#27362f;font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(8px)}
.image-arrow{position:absolute;right:.75rem;top:.75rem;display:grid;width:30px;height:30px;place-items:center;border-radius:50%;background:#fffefaed;color:#263b35;font-size:.95rem;opacity:0;transform:translateY(3px);transition:opacity .2s ease,transform .2s ease}
.article-card:hover .image-arrow,.article-image-link:focus-visible .image-arrow{opacity:1;transform:translateY(0)}
.article-copy{display:grid;align-content:start;gap:.32rem;padding:1rem}
.article-copy .eyebrow{font-size:.59rem;letter-spacing:.09em}
.article-card h3{font-size:1.15rem;line-height:1.27;margin:.12rem 0 .1rem}
.article-card p{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:3;margin:.05rem 0 .4rem;font-size:.81rem;line-height:1.55;color:#62665f}
.article-card .metadata{gap:.3rem .48rem;padding-top:.25rem;border-top:1px solid #eeeee8;font-size:.64rem}
.compact{display:grid;grid-template-columns:108px minmax(0,1fr);gap:.8rem;align-items:start;border:0;border-radius:0;background:transparent;box-shadow:none;transform:none}
.compact:hover{transform:none;border-color:transparent;box-shadow:none}
.compact .article-image-link{border-radius:5px}
.compact .article-image-link :deep(.cover-art){min-height:80px;aspect-ratio:1.24}
.compact .image-category,.compact .image-arrow{display:none}
.compact :deep(.article-copy){padding:0}
.compact h3{font-size:.98rem;margin:.15rem 0 .2rem;line-height:1.2}
.compact p{display:none}
.compact .metadata{padding:0;border:0;font-size:.62rem}
@media(max-width:600px){.article-copy{padding:.85rem}.image-arrow{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.article-card,.article-image-link :deep(.cover-art),.image-arrow{transition:none}}
</style>
