<script setup lang="ts">
const config = useRuntimeConfig()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-top">
      <div class="footer-brand"><img src="/images/brand-jabuticaba.png" alt="" width="72" height="68"><div><strong>Pé de Prosa</strong><span>Conteúdo que rende conversa</span></div></div>
      <p>Histórias, ideias e bons encontros para ler o Brasil por outros ângulos.</p>
      <nav aria-label="Links do rodapé"><NuxtLink to="/sobre">Sobre</NuxtLink><NuxtLink to="/autores">Autores</NuxtLink><NuxtLink to="/assuntos">Assuntos</NuxtLink><NuxtLink to="/politica-editorial">Política editorial</NuxtLink><NuxtLink to="/privacidade">Privacidade</NuxtLink><NuxtLink to="/busca">Buscar no acervo</NuxtLink><NuxtLink v-if="config.public.editorialDemo" to="/redacao">Área editorial local</NuxtLink></nav>
    </div>
    <div class="container footer-bottom"><span>© {{ year }} Pé de Prosa</span><span>Uma publicação editorial independente</span><NuxtLink v-if="config.public.editorialDemo" to="/redacao">Redação</NuxtLink></div>
  </footer>
</template>

<style scoped>
.site-footer{margin-top:4rem;background:var(--forest);color:#f8f2e8;padding:2.5rem 0 1rem}.footer-top{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:2rem;align-items:center;padding-bottom:2rem}.footer-brand{display:flex;align-items:center;gap:.8rem}.footer-brand img{object-fit:contain}.footer-brand strong{display:block;font:700 1.7rem/1 var(--serif)}.footer-brand span{display:block;font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:#ddc9a3;margin-top:.4rem}.footer-top p{color:#e0ddd2;font-size:.9rem;max-width:320px}.footer-top nav{display:flex;flex-direction:column;gap:.5rem;justify-self:end;font-size:.82rem}.footer-bottom{border-top:1px solid #ffffff38;padding-top:1rem;display:flex;justify-content:space-between;gap:1rem;color:#d3d5cc;font-size:.68rem}.footer-bottom a{font-weight:700}@media(max-width:680px){.footer-top{grid-template-columns:1fr;gap:.8rem}.footer-top nav{justify-self:start;flex-direction:row;flex-wrap:wrap}.footer-bottom{flex-wrap:wrap}.footer-bottom span:nth-child(2){display:none}}
</style>
