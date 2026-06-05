import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'src/ui/generated-client.ts')
const stylesInputPath = resolve(root, 'src/ui/shadcn.css')
const stylesOutputPath = resolve(root, 'src/ui/generated-shadcn-styles.ts')
const tailwindBinary = resolve(root, 'node_modules/.bin/tailwindcss')
const execFileAsync = promisify(execFile)

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

const tempDirectory = await mkdtemp(resolve(tmpdir(), 'settleup-shadcn-'))
const tempCssPath = resolve(tempDirectory, 'shadcn.css')

try {
  await execFileAsync(tailwindBinary, [
    '--input',
    stylesInputPath,
    '--output',
    tempCssPath,
    '--minify'
  ], {
    cwd: root
  })

  const shadcnStyles = await readFile(tempCssPath, 'utf8')
  await writeFile(
    stylesOutputPath,
    `export const shadcnStyles = ${JSON.stringify(shadcnStyles)}\n`,
    'utf8'
  )
} finally {
  await rm(tempDirectory, { recursive: true, force: true })
}
