import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'src/ui/generated-client.ts')

const result = await build({
  entryPoints: [resolve(root, 'src/ui/react-client.tsx')],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'SettleUpClient',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})

const bundled = result.outputFiles.at(0)?.text
if (!bundled) {
  throw new Error('Client bundle did not produce output')
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(
  outputPath,
  `export const clientScript = ${JSON.stringify(bundled)}\n`,
  'utf8'
)
