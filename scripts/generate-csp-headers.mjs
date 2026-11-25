import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.output/public')
const executableTypes = new Set(['', 'text/javascript', 'application/javascript', 'module', 'importmap'])
const inlineScripts = new Set()

async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectHtml(filePath)
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue

    const html = await readFile(filePath, 'utf8')
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attributes = match[1]
      if (/\bsrc\s*=/i.test(attributes)) continue
      const typeMatch = attributes.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const type = (typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '').toLowerCase()
      if (!executableTypes.has(type)) continue
      const digest = createHash('sha256').update(match[2], 'utf8').digest('base64')
      inlineScripts.add(`'sha256-${digest}'`)
    }
  }
}

await collectHtml(outputDirectory)
if (!inlineScripts.size) throw new Error('No executable inline scripts found; refusing to emit an incomplete CSP.')

const scriptHashes = [...inlineScripts].sort().join(' ')
const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' ${scriptHashes}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://pedeprosa-api.dona-de-ouro-demo.workers.dev; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests

/_nuxt/*
  Cache-Control: public, max-age=31536000, immutable
`

await writeFile(path.join(outputDirectory, '_headers'), headers)
console.log(`Generated Netlify security headers with ${inlineScripts.size} inline script hash(es).`)
