<script setup lang="ts">
const props = defineProps<{ article: { id?: string; slug?: string; category?: string; title?: string; cover?: string; alt_text?: string } }>()

const crop: Record<string, string> = {
  city: '0% 0%',
  market: '50% 0%',
  kitchen: '100% 0%',
  reading: '0% 100%',
  workshop: '50% 100%',
  trees: '100% 100%'
}

const subjectCrop = computed(() => {
  const subject = `${props.article.cover || ''} ${props.article.slug || ''} ${props.article.title}`.toLocaleLowerCase('pt-BR')
  if (/feira|fruta|mercado|horta|alimento/.test(subject)) return crop.market
  if (/caderno|receita|cozinha|fam[ií]lia|fotografia|mem[oó]ria/.test(subject)) return crop.kitchen
  if (/livro|biblioteca|leitura|escola|arquivo/.test(subject)) return crop.reading
  if (/oficina|ferramenta|reparo|trabalho|entrega|aprendizagem/.test(subject)) return crop.workshop
  if (/sombra|[aá]rvore|rio|chuva|natureza|clima|parque|pra[cç]a|conviv[eê]ncia/.test(subject)) return crop.trees
  if (/rua|cal[cç]ada|cidade|bairro|casa|festa|vizinhan[cç]a/.test(subject)) return crop.city

  const key = props.article.slug || props.article.id || props.article.title || ''
  const index = [...key].reduce((total, character) => total + character.charCodeAt(0), 0) % 6
  return Object.values(crop)[index]
})

const isCustomPhoto = computed(() => Boolean(props.article.cover && (/^https:\/\//i.test(props.article.cover) || props.article.cover.startsWith('/uploads/'))))
const style = computed(() => isCustomPhoto.value
  ? { backgroundImage: `url("${props.article.cover}")`, backgroundPosition: 'center' }
  : { backgroundPosition: subjectCrop.value })
const alt = computed(() => props.article.alt_text || `Fotografia editorial sobre ${props.article.title || 'esta publicação'}`)
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
