export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return 'User-agent: *\nAllow: /\nDisallow: /redacao\nSitemap: https://pedeprosa.netlify.app/sitemap.xml\n'
})
