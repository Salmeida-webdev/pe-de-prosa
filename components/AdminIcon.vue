<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number | string }>(), { size: 20 })

const paths: Record<string, string> = {
  overview: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z',
  articles: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8',
  site: 'M4 6h16 M4 12h16 M4 18h16 M8 4v4 M15 10v4 M10 16v4',
  pages: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h6',
  categories: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z',
  authors: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6',
  published: 'M20 6 9 17l-5-5',
  review: 'M12 8v4l3 2 M21 12a9 9 0 1 1-2.64-6.36L21 8 M21 3v5h-5',
  draft: 'M8 2h8l5 5v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M16 2v6h5 M8 13h8 M8 17h6',
  arrow: 'M7 17 17 7 M7 7h10v10',
  search: 'm21 21-4.35-4.35 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  clock: 'M12 8v4l3 2 M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9',
  edit: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z',
  image: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M8.5 10a1.5 1.5 0 1 0 0-.01 M22 15l-5-5L5 19'
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path :d="paths[name] || paths.overview" />
  </svg>
</template>
