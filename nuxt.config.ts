export default defineNuxtConfig({
  compatibilityDate: '2026-11-25',
  future: { compatibilityVersion: 4 },
  modules: ['@netlify/nuxt'],
  css: ['~/assets/css/main.css'],
  ssr: true,
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Pé de Prosa — Conteúdo que rende conversa',
      meta: [
        { name: 'theme-color', content: '#f6f1e7' },
        { name: 'description', content: 'Histórias, ideias e bons encontros em uma publicação editorial brasileira.' },
        { property: 'og:site_name', content: 'Pé de Prosa' },
        { property: 'og:locale', content: 'pt_BR' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/brand-jabuticaba.png' },
        { rel: 'alternate', type: 'application/rss+xml', title: 'Pé de Prosa', href: '/feed.xml' }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787/api',
      editorialDemo: process.env.NUXT_PUBLIC_EDITORIAL_DEMO === 'true'
    }
  },
  nitro: {
    prerender: {
      routes: ['/sitemap.xml', '/robots.txt', '/feed.xml'],
      ignore: process.env.NUXT_PUBLIC_EDITORIAL_DEMO === 'true' ? [] : ['/redacao']
    }
  },
  typescript: { strict: true, typeCheck: false }
})
