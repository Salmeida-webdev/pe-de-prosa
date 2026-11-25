<script setup lang="ts">
import { defaultPortalPages, portalFetch } from '~/composables/usePortal'
const page = await portalFetch('/pages/sobre', defaultPortalPages.sobre) as any
useSeoMeta({ title: page.seo_title || page.title, description: page.seo_description || page.summary })
</script>

<template><PortalTextPage :page="page" eyebrow="Sobre a publicação" /></template>
