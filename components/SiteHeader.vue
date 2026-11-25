<script setup lang="ts">
const route = useRoute()
const open = ref(false)
const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date())
const links = [
  { label: 'Cidade & território', to: '/categoria/cidade-territorio' },
  { label: 'Cultura & memória', to: '/categoria/cultura-memoria' },
  { label: 'Comida & cotidiano', to: '/categoria/comida-cotidiano' },
  { label: 'Ideias & sociedade', to: '/categoria/ideias-sociedade' },
  { label: 'Trabalho & tecnologia', to: '/categoria/trabalho-tecnologia' },
  { label: 'Natureza & clima', to: '/categoria/natureza-clima' }
]
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="masthead">
    <div class="container">
      <div class="masthead-top"><span>Uma publicação brasileira</span><time :datetime="new Date().toISOString().slice(0,10)">{{ today }}</time><NuxtLink to="/busca">Buscar <span aria-hidden="true">⌕</span></NuxtLink></div>
      <div class="masthead-main">
        <button class="menu-toggle" type="button" :aria-expanded="open" aria-controls="editorias" @click="open = !open">{{ open ? 'Fechar' : 'Editorias' }}</button>
        <NuxtLink class="brand" to="/" aria-label="Pé de Prosa — início">
          <img src="/images/brand-jabuticaba.png" alt="" width="66" height="62">
          <span><strong>Pé de Prosa</strong><small>Conteúdo que rende conversa</small></span>
        </NuxtLink>
        <NuxtLink class="about-link" to="/assuntos">Assuntos</NuxtLink>
      </div>
      <nav id="editorias" class="editorial-nav" :class="{ open }" aria-label="Editorias">
        <NuxtLink to="/">Últimas</NuxtLink>
        <NuxtLink v-for="item in links" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
        <NuxtLink to="/assuntos">Assuntos</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.masthead{border-bottom:1px solid var(--ink);background:var(--paper)}.masthead-top{height:34px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);font-size:.68rem;letter-spacing:.04em;color:var(--muted)}.masthead-top a{font-weight:700;color:var(--forest)}.masthead-main{min-height:110px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.brand{display:flex;align-items:center;gap:.65rem;text-align:left}.brand img{object-fit:contain;width:70px;height:70px}.brand strong{display:block;font:700 clamp(1.8rem,3vw,2.5rem)/.95 var(--serif);letter-spacing:-.06em;color:var(--forest)}.brand small{display:block;margin-top:.45rem;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--rust);font-weight:700}.about-link{justify-self:end;font-size:.8rem;font-weight:700}.editorial-nav{display:flex;align-items:center;justify-content:space-between;gap:.9rem;min-height:48px;border-top:1px solid var(--line);overflow:auto;white-space:nowrap}.editorial-nav a{font-size:.75rem;font-weight:700;color:#47483f}.editorial-nav a:first-child{color:var(--rust);text-transform:uppercase;letter-spacing:.08em}.menu-toggle{display:none}.menu-toggle:focus-visible{outline:3px solid var(--rust)}
@media(max-width:850px){.masthead-main{grid-template-columns:auto 1fr auto;min-height:88px}.brand{justify-self:center}.brand img{width:54px;height:54px}.brand strong{font-size:1.8rem}.brand small{font-size:.53rem}.menu-toggle{display:inline-flex;border:0;background:none;color:var(--forest);font-weight:700;cursor:pointer}.about-link{font-size:.7rem}.editorial-nav{display:none;position:absolute;z-index:20;left:14px;right:14px;top:125px;box-shadow:var(--shadow);background:var(--white);padding:1rem;white-space:normal;flex-wrap:wrap;justify-content:start}.editorial-nav.open{display:flex}.editorial-nav a{width:calc(50% - 1rem)}}
@media(max-width:520px){.masthead-top span:nth-child(2){display:none}.masthead-main{grid-template-columns:auto 1fr}.about-link{display:none}.brand{justify-self:end}.brand img{width:48px;height:48px}.brand strong{font-size:1.65rem}.brand small{font-size:.48rem}.masthead-top{height:32px}}
</style>
