<script setup lang="ts">
const props = defineProps<{ article: { category?: string; title: string; cover?: string; alt_text?: string } }>()

const crop: Record<string, string> = {
  cidade: '0% 0%',
  cotidiano: '100% 0%',
  comida: '50% 0%',
  cultura: '0% 100%',
  ideias: '0% 100%',
  trabalho: '50% 100%',
  natureza: '100% 100%'
}

const isCustomPhoto = computed(() => Boolean(props.article.cover && (/^https:\/\//i.test(props.article.cover) || props.article.cover.startsWith('/uploads/'))))
const style = computed(() => isCustomPhoto.value
  ? { backgroundImage: `url("${props.article.cover}")`, backgroundPosition: 'center' }
  : { backgroundPosition: crop[props.article.category || 'cultura'] || crop.cultura })
const alt = computed(() => props.article.alt_text || `Fotografia editorial sobre ${props.article.title}`)
</script>

<template>
  <div class="cover-art" :class="props.article.category || 'cultura'" :style="style" role="img" :aria-label="alt">
    <img v-if="isCustomPhoto" :src="props.article.cover" :alt="alt" loading="lazy" decoding="async">
  </div>
</template>

<style scoped>
.cover-art{background-image:url('/images/editorial-contact-sheet.webp');background-size:300% 200%;background-repeat:no-repeat;background-color:#d9d6ce}
.cover-art img{width:100%;height:100%;min-height:inherit;object-fit:cover;position:absolute;inset:0}
</style>
