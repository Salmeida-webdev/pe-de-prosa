import { setResponseHeader } from 'h3'

function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return btoa(String.fromCharCode(...bytes))
}

function cspFor(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://pedeprosa-api.dona-de-ouro-demo.workers.dev",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    'upgrade-insecure-requests'
  ].join('; ')
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const nonce = createNonce()
    event.context.cspNonce = nonce
    setResponseHeader(event, 'Content-Security-Policy', cspFor(nonce))
    setResponseHeader(event, 'Cache-Control', 'no-cache, must-revalidate')
    setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
    setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
    setResponseHeader(event, 'X-Frame-Options', 'DENY')
    setResponseHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  })

  nitroApp.hooks.hook('render:html', (html: any, { event }: any) => {
    const nonce = event.context.cspNonce
    if (!nonce) return
    for (const key of ['head', 'body', 'bodyPrepend', 'bodyAppend']) {
      if (Array.isArray(html[key])) {
        html[key] = html[key].map((chunk: string) => chunk.replace(/<script(?=\s|>)/g, `<script nonce="${nonce}"`))
      }
    }
  })
})
