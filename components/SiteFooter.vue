<script setup lang="ts">
const year = new Date().getFullYear()
const settings = usePortalSettings()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-top">
      <div class="footer-brand"><strong>{{ settings.siteName }}</strong><span>{{ settings.tagline }}</span></div>
      <p>{{ settings.footerDescription }}</p>
      <nav aria-label="Links do rodapé"><NuxtLink to="/sobre">Sobre</NuxtLink><NuxtLink to="/autores">Autores</NuxtLink><NuxtLink to="/assuntos">Editorias e assuntos</NuxtLink><NuxtLink to="/politica-editorial">Política editorial</NuxtLink><NuxtLink to="/privacidade">Privacidade</NuxtLink><NuxtLink to="/busca">Buscar no acervo</NuxtLink></nav>
    </div>
    <div class="container footer-bottom"><span>© {{ year }} {{ settings.siteName }}</span><span>{{ settings.footerSubline }}</span></div>
  </footer>
</template>

<style scoped>
.site-footer{margin-top:4rem;background:#202623;color:#f8f7f1;padding:2.5rem 0 1rem}.footer-top{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:2rem;align-items:center;padding-bottom:2rem}.footer-brand strong{display:block;font:700 2rem/1 var(--serif);letter-spacing:-.045em}.footer-brand span{display:block;font-size:.61rem;letter-spacing:.12em;text-transform:uppercase;color:#d6c9ac;margin-top:.45rem}.footer-top p{color:#d6d9d4;font-size:.86rem;max-width:320px}.footer-top nav{display:grid;grid-template-columns:1fr 1fr;gap:.55rem 1rem;justify-self:end;font-size:.75rem;color:#f5f5ef}.footer-bottom{border-top:1px solid #ffffff35;padding-top:1rem;display:flex;justify-content:space-between;gap:1rem;color:#c6cbc5;font-size:.65rem}@media(max-width:680px){.footer-top{grid-template-columns:1fr;gap:.8rem}.footer-top nav{justify-self:start}.footer-bottom{flex-wrap:wrap}.footer-bottom span:nth-child(2){display:none}}
</style>
