import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import config from './src/site.config.json' assert { type: 'json' }

// Writes the `meta` block from site.config.json into index.html at build time.
//
// Doing it here rather than from React keeps the tags in the served HTML, so
// link unfurlers (Discord, Twitter, search crawlers) see them — none of them
// run the app's JavaScript before reading the head.
function siteMeta() {
  const meta = config.meta || {}
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      const tags = []
      if (meta.title) tags.push({ tag: 'title', children: esc(meta.title), injectTo: 'head' })
      const add = (attrs) => tags.push({ tag: 'meta', attrs, injectTo: 'head' })
      if (meta.description) {
        add({ name: 'description', content: meta.description })
        add({ property: 'og:description', content: meta.description })
        add({ name: 'twitter:description', content: meta.description })
      }
      if (meta.title) {
        add({ property: 'og:title', content: meta.title })
        add({ name: 'twitter:title', content: meta.title })
      }
      if (meta.image) {
        add({ property: 'og:image', content: meta.image })
        add({ name: 'twitter:image', content: meta.image })
        add({ name: 'twitter:card', content: 'summary_large_image' })
      }
      if (meta.themeColor) add({ name: 'theme-color', content: meta.themeColor })
      add({ property: 'og:type', content: 'website' })
      // Drop the placeholder <title> from the source file so the injected
      // one doesn't end up as a second title element.
      return { html: meta.title ? html.replace(/[ \t]*<title>[^<]*<\/title>\n?/, '') : html, tags }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteMeta()],
  base: './',
})
