import { mkdir, readdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('apps/web/dist');
const artifactsDir = path.resolve('artifacts/static-html');

const assetFiles = await readdir(path.join(distDir, 'assets'));
const jsFile = assetFiles.find((file) => file.endsWith('.js'));
const cssFile = assetFiles.find((file) => file.endsWith('.css'));

if (!jsFile || !cssFile) {
  throw new Error('Missing built JS/CSS assets. Run pnpm build:web first.');
}

const [html, js, css] = await Promise.all([
  readFile(path.join(distDir, 'index.html'), 'utf8'),
  readFile(path.join(distDir, 'assets', jsFile), 'utf8'),
  readFile(path.join(distDir, 'assets', cssFile), 'utf8')
]);

const inlined = html
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, `<script type="module">${js}</script>`)
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, `<style>${css}</style>`);

await rm(artifactsDir, { recursive: true, force: true });
await mkdir(artifactsDir, { recursive: true });
await writeFile(path.join(artifactsDir, 'index.html'), inlined, 'utf8');
await copyFile('.env.example', path.join(artifactsDir, '.env.example'));
await writeFile(
  path.join(artifactsDir, 'secrets.template.json'),
  JSON.stringify(
    {
      apiBaseUrl: 'http://localhost:7860',
      backendSharedSecret: 'replace-with-backend-shared-secret',
      accessPassword: 'optional-password-if-your-backend-requires-it'
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log('Static artifact written to artifacts/static-html/index.html');
