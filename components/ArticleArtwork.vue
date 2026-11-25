<script setup lang="ts">
const props = defineProps<{ article: { category?: string; title: string; cover?: string; alt_text?: string } }>()
const category = computed(() => props.article.category || 'cultura')
const alt = computed(() => props.article.alt_text || ({ cidade: 'Ilustração editorial de casas brasileiras e vida de bairro', cultura: 'Ilustração editorial de livros e memória', cotidiano: 'Ilustração editorial de caderno de receitas e vida cotidiana', ideias: 'Ilustração editorial sobre leitura e ideias', trabalho: 'Ilustração editorial sobre trabalho e deslocamento', natureza: 'Ilustração editorial de uma jabuticabeira e paisagem brasileira' }[category.value] || 'Ilustração editorial do Pé de Prosa'))
const image = computed(() => {
  const files: Record<string, string> = {
    cidade: '/images/casas-brasileiras.png',
    cultura: '/images/livros-leitura.png',
    cotidiano: '/images/caderno-receitas.png',
    ideias: '/images/livros-leitura.png',
    trabalho: '/images/trabalho-entrega.png',
    natureza: '/images/brand-jabuticaba.png'
  }
  return files[category.value] || files.cultura
})
</script>

<template>
  <div class="cover-art" :class="category">
    <img :src="image" :alt="alt" width="900" height="600" loading="lazy">
  </div>
</template>
