/*
 * Проверка внутренних ссылок и подключаемых файлов.
 * Запуск:  node tools/check-links.mjs
 *
 * Обходит все .html в проекте, собирает href, src и ссылки на стили,
 * и проверяет, что каждый внутренний адрес существует на диске.
 * Внешние ссылки (http, mailto, tel) не проверяются — только их вид.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '_source', 'shots', '.claude']);

function htmlFiles(dir = ROOT, found = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) htmlFiles(full, found);
    else if (name.endsWith('.html')) found.push(full);
  }
  return found;
}

const problems = [];
const externals = new Set();
let checked = 0;

for (const file of htmlFiles()) {
  const html = readFileSync(file, 'utf8');
  const short = relative(ROOT, file).split(sep).join('/');
  const refs = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)].map(m => m[1]);

  for (const raw of refs) {
    const ref = raw.trim();
    if (!ref || ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('javascript:')) continue;

    if (/^(https?:|mailto:|tel:)/.test(ref)) {
      externals.add(ref);
      if (/^http:\/\//.test(ref)) problems.push(`${short}: ссылка без https — ${ref}`);
      continue;
    }
    if (ref.startsWith('/')) {
      problems.push(`${short}: абсолютный путь «${ref}» сломается на GitHub Pages, нужен относительный`);
      continue;
    }

    checked++;
    const [path] = ref.split(/[?#]/);
    if (!path) continue;
    let target = resolve(dirname(file), path);
    if (path.endsWith('/')) target = join(target, 'index.html');
    if (!existsSync(target)) problems.push(`${short}: не найден файл по ссылке «${ref}»`);
  }
}

/* Проверяем, что внешние ссылки на Ozon оформлены единообразно. */
for (const url of externals) {
  if (/ozon\.ru\/product\//.test(url) && !/^https:\/\/www\.ozon\.ru\/product\/\d+\/(reviews\/|questions\/)?$/.test(url)) {
    problems.push(`ссылка на Ozon необычного вида: ${url}`);
  }
}

console.log(`Проверено внутренних ссылок: ${checked}. Внешних адресов: ${externals.size}.`);
if (problems.length) {
  console.log(`\nНайдено проблем: ${problems.length}`);
  for (const p of problems) console.log('  • ' + p);
  process.exitCode = 1;
} else {
  console.log('Битых внутренних ссылок нет.');
}
