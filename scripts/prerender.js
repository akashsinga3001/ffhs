import { build } from 'vite'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const ssrOutDir = path.join(root, 'dist-ssr')
const distIndexPath = path.join(root, 'dist', 'index.html')

async function buildServerBundle() {
  await build({
    root,
    logLevel: 'warn',
    build: {
      ssr: path.join(root, 'src/entry-server.js'),
      outDir: 'dist-ssr',
      emptyOutDir: true,
      rollupOptions: {
        output: { entryFileNames: 'entry-server.js' },
      },
    },
  })
}

async function main() {
  await buildServerBundle()

  const entryPath = path.join(ssrOutDir, 'entry-server.js')
  const { renderLanding } = await import(pathToFileURL(entryPath).href)
  const landingHtml = await renderLanding()

  const template = await readFile(distIndexPath, 'utf-8')
  if (!template.includes('<div id="app"></div>')) {
    throw new Error('prerender: expected <div id="app"></div> placeholder not found in dist/index.html')
  }
  const withLanding = template.replace('<div id="app"></div>', `<div id="app">${landingHtml}</div>`)
  await writeFile(distIndexPath, withLanding, 'utf-8')

  await rm(ssrOutDir, { recursive: true, force: true })

  console.log('[prerender] landing page injected into dist/index.html')
}

main().catch((err) => {
  console.error('[prerender] failed:', err)
  process.exit(1)
})
