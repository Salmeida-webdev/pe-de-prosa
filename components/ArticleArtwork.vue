<script setup lang="ts">
const props = withDefaults(defineProps<{ article: { id?: string; slug?: string; category?: string; category_name?: string; title?: string; excerpt?: string; cover?: string; alt_text?: string }; priority?: boolean }>(), { priority: false })

type EditorialPhoto = { src: string; alt: string; keywords: string[] }

const photos: EditorialPhoto[] = [
  { src: '/images/editorial/street-neighborhood.webp', alt: 'Rua residencial de bairro com casas, bicicletas e árvores', keywords: ['rua', 'calçada', 'cidade', 'bairro', 'casa', 'vizinhança', 'esquina'] },
  { src: '/images/editorial/market-produce.webp', alt: 'Feirante organiza frutas frescas em uma banca de mercado', keywords: ['feira', 'fruta', 'mercado', 'banca', 'horta', 'comércio local', 'alimento'] },
  { src: '/images/editorial/family-recipe.webp', alt: 'Pessoa anota uma receita em um caderno sobre a mesa da cozinha', keywords: ['caderno', 'receita', 'cozinha', 'almoço', 'jantar', 'mesa', 'comida', 'família'] },
  { src: '/images/editorial/community-library.webp', alt: 'Estante de livros em uma biblioteca comunitária de bairro', keywords: ['livro', 'biblioteca', 'leitura', 'arquivo', 'estante', 'romance'] },
  { src: '/images/editorial/repair-workshop.webp', alt: 'Trabalhador conserta um objeto em uma oficina comunitária', keywords: ['oficina', 'ferramenta', 'reparo', 'conserto', 'manutenção', 'trabalho manual'] },
  { src: '/images/editorial/tree-lined-walk.webp', alt: 'Caminho sombreado por árvores em uma praça de bairro', keywords: ['sombra', 'árvore', 'rio', 'chuva', 'natureza', 'clima', 'parque', 'praça', 'convivência'] },
  { src: '/images/editorial/bus-stop-morning.webp', alt: 'Moradores aguardam o ônibus em um ponto de bairro ao amanhecer', keywords: ['ônibus', 'transporte', 'mobilidade', 'ponto', 'espera', 'deslocamento', 'travessia', 'passagem'] },
  { src: '/images/editorial/community-music.webp', alt: 'Grupo de músicos ensaia percussão em um centro cultural', keywords: ['música', 'percussão', 'instrumento', 'som', 'festa', 'cortejo', 'celebração', 'ritmo'] },
  { src: '/images/editorial/adult-classroom.webp', alt: 'Professora acompanha estudantes adultos durante uma atividade de leitura', keywords: ['escola', 'ensino', 'estudante', 'professor', 'aprendizagem', 'educação', 'aula', 'leitura'] },
  { src: '/images/editorial/community-health-visit.webp', alt: 'Profissional de saúde conversa com uma moradora durante uma visita domiciliar', keywords: ['saúde', 'cuidado', 'atendimento', 'visita', 'idoso', 'moradora'] },
  { src: '/images/editorial/family-sunday-meal.webp', alt: 'Família prepara uma refeição compartilhada em casa', keywords: ['família', 'domingo', 'refeição', 'hospitalidade', 'cozinha', 'almoço', 'jantar'] },
  { src: '/images/editorial/artisan-sewing.webp', alt: 'Costureira trabalha em uma peça de tecido em seu ateliê', keywords: ['costura', 'artesanato', 'tecido', 'roupa', 'costureira', 'ateliê', 'ofício'] },
  { src: '/images/editorial/river-after-rain.webp', alt: 'Morador observa um rio após a chuva em uma comunidade ribeirinha', keywords: ['rio', 'água', 'chuva', 'alagamento', 'enchente', 'nascente', 'território'] },
  { src: '/images/editorial/pottery-market.webp', alt: 'Artesã apresenta peças de cerâmica em uma feira ao ar livre', keywords: ['cerâmica', 'oleiro', 'artesão', 'artesanato', 'feira', 'barro', 'ofício'] },
  { src: '/images/editorial/neighborhood-meeting.webp', alt: 'Moradores conversam durante uma reunião comunitária', keywords: ['comunidade', 'reunião', 'associação', 'conselho', 'moradores', 'debate', 'participação'] },
  { src: '/images/editorial/coffee-roastery.webp', alt: 'Produtor seleciona grãos em uma pequena torrefação de café', keywords: ['café', 'torra', 'grão', 'torrefação', 'coado', 'cafeteria', 'pausa'] },
  { src: '/images/editorial/coastal-fishing.webp', alt: 'Pescadores recolhem redes à beira-mar no início da manhã', keywords: ['pesca', 'pescador', 'mar', 'litoral', 'praia', 'barco', 'costa', 'rede'] },
  { src: '/images/editorial/community-garden.webp', alt: 'Moradora e criança colhem verduras em uma horta comunitária', keywords: ['horta', 'plantio', 'jardim', 'agricultura', 'verdura', 'cultivo', 'alimentação'] }
]

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

const topicGroups = [
  { keywords: ['rua', 'calçada', 'cidade', 'bairro', 'casa', 'vizinhança', 'esquina', 'praça', 'passeio', 'caminho', 'deslocamento'], photoIds: [0, 5, 6, 12, 14, 17] },
  { keywords: ['comida', 'almoço', 'jantar', 'feira', 'fruta', 'receita', 'cozinha', 'mesa', 'mercado', 'café', 'cotidiano', 'refeição'], photoIds: [1, 2, 10, 13, 15, 17] },
  { keywords: ['cultura', 'memória', 'livro', 'biblioteca', 'leitura', 'festa', 'música', 'percussão', 'arquivo', 'tradição', 'fotografia'], photoIds: [3, 7, 8, 13, 14, 10] },
  { keywords: ['trabalho', 'oficina', 'reparo', 'ofício', 'artesanato', 'costura', 'emprego', 'entrega', 'renda', 'ferramenta'], photoIds: [4, 11, 15, 6, 1, 8] },
  { keywords: ['natureza', 'clima', 'árvore', 'sombra', 'rio', 'chuva', 'água', 'mar', 'litoral', 'horta'], photoIds: [5, 12, 16, 17, 0, 6] },
  { keywords: ['sociedade', 'ideias', 'comunidade', 'reunião', 'associação', 'saúde', 'escola', 'educação', 'cuidado', 'estudante', 'professor'], photoIds: [14, 9, 8, 17, 4, 3] }
]

const selectedPhoto = computed(() => {
  const subject = normalize(`${props.article.title || ''} ${props.article.slug || ''} ${props.article.excerpt || ''} ${props.article.category || ''} ${props.article.category_name || ''}`)
  const scores = topicGroups.map(group => group.keywords.reduce((score, keyword) => score + (subject.includes(normalize(keyword)) ? keyword.length : 0), 0))
  const bestScore = Math.max(...scores)
  const matchingGroups = topicGroups.flatMap((group, index) => scores[index] === bestScore && bestScore > 0 ? [group] : [])
  const key = props.article.slug || props.article.id || props.article.title || ''
  const hash = [...key].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7)
  const pool = matchingGroups.length ? matchingGroups[hash % matchingGroups.length]?.photoIds || [] : photos.map((_, index) => index)
  const photoIndex = pool[hash % pool.length] ?? 0
  return photos[photoIndex] || photos[0]!
})

const customPhoto = computed(() => Boolean(props.article.cover && (/^https:\/\//i.test(props.article.cover) || props.article.cover.startsWith('/uploads/'))))
const imageSrc = computed(() => customPhoto.value ? props.article.cover! : selectedPhoto.value.src)
const alt = computed(() => customPhoto.value ? props.article.alt_text || `Fotografia editorial sobre ${props.article.title || 'esta publicação'}` : selectedPhoto.value.alt)
</script>

<template>
  <div class="cover-art" :class="props.article.category || 'cultura'">
    <img :src="imageSrc" :alt="alt" :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined" decoding="async">
  </div>
</template>

<style scoped>
.cover-art{position:relative;isolation:isolate;overflow:hidden;display:block;aspect-ratio:1.58;min-height:205px;border-radius:0;background:#d9d6ce}
.cover-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .35s ease,filter .35s ease}
@media(prefers-reduced-motion:reduce){.cover-art img{transition:none}}
</style>
