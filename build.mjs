/*
 * Сборщик сайта «Золотой телёнок Алтая».
 * Запуск:  node build.mjs
 *
 * Зависимостей нет: только стандартная библиотека Node (18+).
 * Что делает:
 *   1. собирает служебные страницы из content/pages/*.md;
 *   2. подставляет общие шапку и подвал на все страницы, включая index.html и product.html
 *      (между метками <!--#header--> … <!--/#header--> и <!--#footer--> … <!--/#footer-->);
 *   3. пишет sitemap.xml и robots.txt, если в data/company.json заполнен siteUrl.
 *
 * Все внутренние ссылки относительные, поэтому сайт работает и по file://,
 * и на любом статическом хостинге, в том числе в подпапке (GitHub Pages).
 * В тексте страниц ссылка на свою страницу пишется как ~/kak-kupit/ —
 * сборщик подставит нужное число «../».
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(ROOT, p), 'utf8');
const readJSON = p => JSON.parse(read(p));

const company = readJSON('data/company.json');
const SITE_URL = (company.siteUrl || '').trim();

/* ───────────────────────── разметка Markdown ───────────────────────── */

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(src) {
  const code = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(c) - 1}\u0000`);
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const external = /^https?:/.test(href);
    const attrs = external ? ' target="_blank" rel="nofollow noopener"' : '';
    return `<a href="${href}"${attrs}>${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(code[Number(i)])}</code>`);
}

function markdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const tableRow = l => /^\s*\|.*\|\s*$/.test(l);
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Готовый HTML — пропускаем как есть до пустой строки.
    if (/^\s*</.test(line)) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) buf.push(lines[i++]);
      out.push(buf.join('\n'));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // Таблица: строка заголовка, строка-разделитель, дальше тело.
    if (tableRow(line) && tableRow(lines[i + 1] || '') && /^[\s|:-]+$/.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && tableRow(lines[i])) body.push(cells(lines[i++]));
      out.push(
        '<div class="table-scroll"><table><thead><tr>' +
        head.map(c => `<th>${c}</th>`).join('') +
        '</tr></thead><tbody>' +
        body.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>'
      );
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${markdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    const bullet = /^\s*[-*]\s+/, numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, '');
        // продолжение пункта на следующей строке с отступом
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !re.test(lines[i])) {
          item += ' ' + lines[i++].trim();
        }
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|[-*]\s|\d+[.)]\s|>|<|---)/.test(lines[i])) {
      para.push(lines[i++]);
    }
    if (para.length) out.push(`<p>${inline(para.join(' ').trim())}</p>`);
    else i++;
  }
  return out.join('\n');
}

/* ──────────── подстановка данных магазина в текст страниц ────────────
   {{email}} — значение из data/company.json (пустое превращается в пустую строку);
   {{#if email}} … {{/if}} — блок показывается, только если поле заполнено.
   Так на странице не появляется выдуманный реквизит вместо незаполненного. */

const field = key => key.split('.').reduce((o, k) => (o == null ? o : o[k]), company);
const filled = key => {
  const v = field(key);
  return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '' && v !== false;
};

function applyData(text) {
  let out = text;
  let guard = 0;
  // Вложенные условия раскрываются изнутри наружу.
  while (/\{\{#if\s+[\w.]+\}\}/.test(out) && guard++ < 20) {
    out = out.replace(/\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/g,
      (_, key, inner) => (filled(key) ? inner : ''));
  }
  return out.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    const v = field(key);
    if (v === undefined || v === null) return '';
    return Array.isArray(v) ? v.join(', ') : String(v);
  });
}

/* ───────────────────────── front matter ───────────────────────── */

function parseFrontMatter(raw) {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: text };
  const data = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && key) { (data[key] = Array.isArray(data[key]) ? data[key] : []).push(unquote(listItem[1])); continue; }
    const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!pair) continue;
    key = pair[1];
    const value = pair[2].trim();
    if (value === '') data[key] = [];
    else if (value === 'true' || value === 'false') data[key] = value === 'true';
    else data[key] = unquote(value);
  }
  return { data, body: text.slice(m[0].length) };
}
const unquote = s => s.replace(/^["']|["']$/g, '').trim();

/* ───────────────────────── навигация и подвал ───────────────────────── */

const NAV = [
  { href: 'index.html#catalog', text: 'Каталог' },
  { href: 'podbor/', text: 'Подбор по животному', when: () => exists('podbor/index.html') },
  { href: 'zhurnal/', text: 'Журнал', when: () => exists('zhurnal/index.html') },
  { href: 'faq/', text: 'Вопросы и ответы', when: () => exists('faq/index.html') },
  { href: 'kak-kupit/', text: 'Как купить' },
  { href: 'kontakty/', text: 'Контакты' }
];
const exists = p => existsSync(join(ROOT, p));

const FOOTER_GROUPS = [
  {
    title: 'Каталог товаров',
    links: [
      { href: 'index.html#catalog', text: 'Все товары' },
      { href: 'podbor/', text: 'Подбор по животному', when: () => exists('podbor/index.html') },
      { href: 'zhurnal/', text: 'Журнал', when: () => exists('zhurnal/index.html') }
    ]
  },
  {
    title: 'Покупателям',
    links: [
      { href: 'kak-kupit/', text: 'Как купить' },
      { href: 'dostavka/', text: 'Доставка' },
      { href: 'oplata/', text: 'Оплата' },
      { href: 'vozvrat/', text: 'Возврат' },
      { href: 'opt/', text: 'Оптовым покупателям' }
    ]
  },
  {
    title: 'О магазине',
    links: [
      { href: 'o-magazine/', text: 'О магазине' },
      { href: 'kontakty/', text: 'Контакты и реквизиты' },
      { href: 'dokumenty/', text: 'Документы на товары' },
      { href: 'privacy/', text: 'Политика обработки персональных данных' }
    ]
  }
];

/* Дисклеймер из раздела 3 отчёта. Показывается на каждой странице. */
const DISCLAIMER = [
  'Информация о товарах и ценах носит справочный характер и не является публичной офертой (ст. 437 ГК РФ). Договор купли-продажи заключается на Ozon.',
  'Магазин является продавцом, а не производителем товаров. Товарные знаки принадлежат их правообладателям. Сведения приведены по данным производителей — перед применением сверяйтесь с этикеткой.'
];

/* ───────────────────────── шаблон страницы ───────────────────────── */

const rel = (depth, href) => (href.startsWith('http') || href.startsWith('#') ? href : '../'.repeat(depth) + href);

/* Адреса страниц-черновиков. В меню и подвале они не показываются. */
const DRAFTS = new Set();
const visible = item => !DRAFTS.has(item.href) && (typeof item.when === 'function' ? item.when() : true);

function header(depth, { active } = {}) {
  const r = h => rel(depth, h);
  const links = NAV.filter(visible).map(n => {
    const current = active && n.href === active ? ' aria-current="page"' : '';
    return `<a href="${r(n.href)}"${current}>${n.text}</a>`;
  }).join('');
  return `<div class="demo-bar"><span class="demo-indicator"></span><b>Макет магазина</b><span class="separator">·</span> Цены демонстрационные, заказы и платежи пока не принимаются</div>
<header class="site-header" id="top">
 <div class="header-top container">
  <a class="identity" href="${r('index.html')}" aria-label="${company.shopName} — на главную"><img src="${r('images/brand-symbol.png')}" alt="" width="102" height="60"><span class="brand-words"><strong>Золотой теленок</strong><strong class="brand-bottom">Алтая<span class="golden-stroke"></span></strong></span></a>
  <div class="brand-tagline">ТОВАРЫ ДЛЯ ЗДОРОВЬЯ<br>ЖИВОТНЫХ И УСПЕШНОГО<br>ХОЗЯЙСТВА <svg class="mountains" viewBox="0 0 125 50" aria-hidden="true"><path d="M2 44 30 29 43 37 67 9 88 29 100 23 122 43 M39 37 51 25 M64 13 72 23 M85 28 90 37"/></svg></div>
  <div class="head-meta"><span class="meta-icon">♧</span><span>Алтайский характер<br><small>в каждом товаре</small></span></div>
  <div class="head-meta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3 4 5c-1 9 8 18 16 15l2-3-6-4-3 3c-3-2-6-5-7-8l3-3-2-2z"/></svg><span>Для всей России<br><small>Доставка — при запуске</small></span></div>
  <div class="head-actions"><button id="mobileMenuToggle" class="menu-toggle" aria-label="Открыть меню" aria-expanded="false">☰</button><button class="cart-top" id="openCart" aria-label="Открыть корзину"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4h3l2 12h12l3-9H6M9 21h.01M18 21h.01"/></svg><span>Корзина</span><b id="cartCount">0</b></button></div>
 </div>
 <nav class="navline" aria-label="Навигация по сайту"><div class="nav-inner container"><a class="catalog-link" href="${r('index.html#catalog')}"><span>☰</span> Каталог товаров <span>⌄</span></a><div class="nav-links" id="mobileNav">${links}</div><label class="nav-search"><input id="catalogSearch" type="search" placeholder="Поиск по товарам и названиям..." aria-label="Поиск товаров"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></label></div></nav>
</header>`;
}

function footer(depth) {
  const r = h => rel(depth, h);
  const cols = FOOTER_GROUPS.map(g => {
    const links = g.links.filter(visible).map(l => `<a href="${r(l.href)}">${l.text}</a>`).join('');
    return `<div><h3>${g.title}</h3>${links}</div>`;
  }).join('');

  // Пустые реквизиты не выводятся, вместо них ничего не подставляется.
  const requisites = [
    company.legalName,
    company.ogrnip && `ОГРНИП ${company.ogrnip}`,
    company.inn && `ИНН ${company.inn}`,
    company.email
  ].filter(Boolean).join(' · ');

  return `<footer class="footer" id="footer">
 <div class="container footer-cols">
  <div class="footer-brand"><div class="footer-name">Золотой теленок<br><span>Алтая</span></div><p>Товары для животных<br>и фермерского хозяйства</p><p class="footer-city">${company.city}, ${company.region}</p></div>
  ${cols}
 </div>
 <div class="container footer-legal">
  ${DISCLAIMER.map(t => `<p>${t}</p>`).join('\n  ')}
  ${requisites ? `<p class="footer-requisites">${requisites}</p>` : ''}
 </div>
 <div class="container footer-bottom"><span>© 2026 «Золотой теленок Алтая» · демонстрационная версия</span><span>Оплата и отправка заказов отключены</span></div>
</footer>`;
}

function layout(page) {
  const depth = page.url === '' ? 0 : page.url.split('/').filter(Boolean).length;
  const r = h => rel(depth, h);
  const canonical = SITE_URL ? `\n<link rel="canonical" href="${SITE_URL}${page.url}">` : '';
  const trail = page.crumbs || [];
  const crumbs = [
    `<a href="${r('index.html')}">Главная</a>`,
    ...trail.map(c => `<a href="${r(c.href)}">${escapeHtml(c.text)}</a>`),
    `<span>${escapeHtml(page.title)}</span>`
  ].join('<span>›</span>');
  const draftNote = page.draft
    ? `<div class="draft-note" role="note"><b>Черновик, не публиковать.</b> Страница станет действительной после того, как в <code>data/company.json</code> будут заполнены реквизиты ИП.</div>`
    : '';

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#123b28">
<meta name="description" content="${escapeHtml(page.description || '')}">
<title>${escapeHtml(page.title)} — ${company.shopName}</title>${canonical}
<meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description || '')}"><meta property="og:locale" content="ru_RU">
<link rel="icon" href="${r('images/brand-symbol.png')}">
<link rel="stylesheet" href="${r('styles.css')}"><link rel="stylesheet" href="${r('pages.css')}"><link rel="stylesheet" href="${r('podbor.css')}">
<script defer src="${r('products.js')}"></script><script defer src="${r('site.js')}"></script>
</head>
<body>
<!--#header-->
${header(depth, { active: page.url })}
<!--/#header-->
<main class="text-main container">
 <nav class="breadcrumbs" aria-label="Навигационная цепочка">${crumbs}</nav>
 ${draftNote}
 <article class="text-page${page.wide ? ' text-page-wide' : ''}">
  <h1>${escapeHtml(page.title)}</h1>
  ${page.lead ? `<p class="text-lead">${inline(page.lead)}</p>` : ''}
  ${page.body}
 </article>
</main>
<!--#footer-->
${footer(depth)}
<!--/#footer-->
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</body></html>
`;
}

/* ───────────────────────── сборка страниц ───────────────────────── */

function collectPages() {
  const dir = join(ROOT, 'content/pages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).map(file => {
    const { data, body } = parseFrontMatter(read(`content/pages/${file}`));
    const url = data.url ?? file.replace(/\.md$/, '') + '/';
    const depth = url.split('/').filter(Boolean).length;
    return {
      url,
      title: data.title || file,
      description: data.description || '',
      lead: data.lead || '',
      draft: Boolean(data.draft),
      changefreq: data.changefreq || 'yearly',
      body: markdown(applyData(body)).replace(/~\//g, '../'.repeat(depth))
    };
  });
}

function writePage(page) {
  const outDir = join(ROOT, page.url);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), layout(page), 'utf8');
}

/* Подстановка общих шапки и подвала в уже существующие страницы. */
function injectInto(file, depth) {
  const path = join(ROOT, file);
  if (!existsSync(path)) return false;
  const original = readFileSync(path, 'utf8');
  let next = original;
  const swap = (name, html) => {
    const re = new RegExp(`(<!--#${name}-->)[\\s\\S]*?(<!--/#${name}-->)`);
    if (!re.test(next)) { console.warn(`  ! в ${file} нет меток <!--#${name}--> … <!--/#${name}-->`); return; }
    next = next.replace(re, `$1\n${html}\n$2`);
  };
  swap('header', header(depth, { active: file === 'index.html' ? '' : null }));
  swap('footer', footer(depth));
  if (file === 'index.html' && homeHubs) swap('podbor', homeHubs);
  if (next !== original) { writeFileSync(path, next, 'utf8'); return true; }
  return false;
}

/* ──────────────────── подбор по животному ────────────────────
   Хабы собираются из data/animals.json. Привязка товаров к хабу — строго
   по назначению с этикетки; товар, назначение которого не подтверждено,
   в хаб не ставится. Товары магазина на Ozon, которых нет в каталоге сайта,
   показываются ссылкой без цены и корзины.
   Цен и кнопок покупки в хабах нет ни у одной группы товаров. */

/* products.js — обычный скрипт браузера без обращений к странице,
   поэтому его можно выполнить здесь и получить массив товаров. */
function loadProducts() {
  const src = read('products.js');
  return new Function(`${src}\nreturn products;`)();
}

const HUB_DISCLAIMER = {
  feed: 'Кормовая добавка. Не является лекарственным средством. Применяйте по инструкции производителя. При признаках заболевания обратитесь к ветеринарному специалисту.',
  care: 'Средство для ухода за кожей. Не является лекарственным средством для ветеринарного применения. При покраснении, отёке или уплотнении вымени обратитесь к ветеринарному специалисту.',
  protection: 'Прочитайте инструкцию на упаковке и применяйте средство строго по ней. Опасно для человека, домашних и сельскохозяйственных животных и птицы. Храните отдельно от продуктов и кормов. При отравлении немедленно обратитесь к врачу или ветеринарному специалисту и возьмите упаковку.'
};

function hubCard(product, prefix) {
  return `<a class="hub-card" href="${prefix}product.html?id=${encodeURIComponent(product.id)}">
   <span class="hub-card-photo"><img src="${prefix}${product.image}" alt="" loading="lazy"></span>
   <span class="hub-card-text">
    <span class="hub-card-name">${escapeHtml(product.name)}</span>
    <span class="hub-card-type">${escapeHtml(product.categoryLabel)}</span>
    <span class="hub-card-open">Подробнее <span aria-hidden="true">→</span></span>
   </span>
  </a>`;
}

function ozonCard(item) {
  return `<div class="hub-ozon-card">
   <span class="hub-ozon-mark">В каталоге на Ozon</span>
   <strong>${escapeHtml(item.name)}</strong>
   ${item.note ? `<span class="hub-ozon-note">${escapeHtml(item.note)}</span>` : ''}
   <a href="https://www.ozon.ru/product/${item.sku}/" target="_blank" rel="nofollow noopener">Смотреть на Ozon ↗</a>
  </div>`;
}

function buildHubs() {
  if (!existsSync(join(ROOT, 'data/animals.json'))) return [];
  const { hubs } = readJSON('data/animals.json');
  const products = loadProducts();
  const byId = id => products.find(p => p.id === id);
  const prefix = '../../';

  for (const hub of hubs) {
    const groups = hub.groups || [{ title: null, products: hub.products || [] }];
    const used = groups.flatMap(g => g.products).map(byId).filter(Boolean);

    const safety = hub.safetyFirst
      ? `<div class="warning"><h2>Сначала о безопасности</h2><ul>${hub.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul></div>`
      : (hub.notes?.length ? `<h2>Что важно знать</h2><ul>${hub.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : '');

    const own = groups.map(g => {
      const cards = g.products.map(byId).filter(Boolean).map(p => hubCard(p, prefix)).join('');
      if (!cards) return '';
      return `${g.title ? `<h3>${escapeHtml(g.title)}</h3>` : ''}<div class="hub-grid">${cards}</div>`;
    }).join('');

    const ozon = (hub.ozonOnly || []).map(ozonCard).join('');
    const categories = [...new Set(used.map(p => p.category))];

    const body = `${safety}
${own ? `<h2>Товары из нашего каталога</h2>${hub.safetyFirst ? '<p class="ref-note">Цен и кнопок покупки в этом разделе нет: ссылки ведут на страницы товаров, где приведены меры безопасности.</p>' : ''}${own}` : ''}
${ozon ? `<h2>Есть в нашем магазине на Ozon</h2><p>Этих товаров пока нет в каталоге сайта. Открыть их можно на Ozon — цену и наличие смотрите там.</p><div class="hub-ozon-grid">${ozon}</div>` : ''}
${categories.map(c => HUB_DISCLAIMER[c] ? `<p class="hub-disclaimer">${HUB_DISCLAIMER[c]}</p>` : '').join('')}
<p class="hub-back"><a href="${prefix}podbor/">← Все разделы подбора</a></p>`;

    writePage({
      url: `podbor/${hub.slug}/`,
      title: hub.title,
      description: hub.description,
      lead: hub.lead,
      wide: true,
      changefreq: 'monthly',
      crumbs: [{ text: 'Подбор по животному', href: 'podbor/' }],
      body
    });
  }

  const tiles = hubs.map(h =>
    `<a class="hub-tile" href="${h.slug}/"><strong>${escapeHtml(h.title)}</strong><span>${escapeHtml(h.lead)}</span><span class="hub-tile-open">Открыть <span aria-hidden="true">→</span></span></a>`
  ).join('');

  writePage({
    url: 'podbor/',
    title: 'Подбор по животному',
    description: 'Выберите животное — покажем товары, у которых оно указано на этикетке производителя.',
    lead: 'Выберите, для кого подбираете корм или уход. В каждом разделе собраны товары, у которых это животное указано на этикетке производителя.',
    wide: true,
    changefreq: 'monthly',
    body: `<div class="hub-tiles">${tiles}</div>
<p class="hub-disclaimer">Если животного нет на этикетке, производитель применение для него не указывает — норму в таком случае мы подсказать не можем. Обратитесь к ветеринарному специалисту.</p>`
  });

  // Блок плиток для главной страницы (подставляется между метками <!--#podbor-->).
  homeHubs = `<section class="categories-hubs container" aria-label="Подбор по животному">
 <div class="section-head"><div><span class="section-label">ПОДБОР ПО ЖИВОТНОМУ</span><h2>Для кого подбираете? <span class="wheat">❧</span></h2></div><a href="podbor/" class="all-products">Все разделы ›</a></div>
 <div class="hub-tiles compact">${hubs.map(h =>
   `<a class="hub-tile" href="podbor/${h.slug}/"><strong>${escapeHtml(h.title)}</strong><span class="hub-tile-open">Открыть <span aria-hidden="true">→</span></span></a>`
 ).join('')}</div>
</section>`;

  return hubs;
}
let homeHubs = '';

/* ──────────────────── справочник товара ────────────────────
   Источник данных — data/reference/<id>.json (по файлу на товар).
   Сборщик делает из каждого файла маленький .js, который страница товара
   подключает отдельным тегом <script> только для открытого товара.
   Так справочник работает и при открытии сайта с диска по file://,
   где fetch() к локальному JSON браузер запрещает.
   Поле "check" — служебное, на сайт не выводится. */

function buildReference() {
  const dir = join(ROOT, 'data/reference');
  if (!existsSync(dir)) return [];
  const built = [];
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const id = file.replace(/\.json$/, '');
    const data = JSON.parse(read(`data/reference/${file}`));
    delete data.check;
    writeFileSync(
      join(dir, `${id}.js`),
      `/* Создаётся автоматически из ${file}. Не редактируйте этот файл — правьте JSON и запускайте node build.mjs */\n` +
      `(window.__reference = window.__reference || {})[${JSON.stringify(id)}] = ${JSON.stringify(data, null, 1)};\n`,
      'utf8'
    );
    built.push(id);
  }
  // Список товаров со справочником: страница товара сверяется с ним и не запрашивает
  // несуществующий файл, иначе браузер показывал бы в консоли ошибку 404.
  writeFileSync(
    join(ROOT, 'data/reference-index.js'),
    `/* Создаётся автоматически. Не редактируйте — запускайте node build.mjs */\n` +
    `window.__referenceIndex = ${JSON.stringify(built.sort())};\n`,
    'utf8'
  );
  return built;
}

/* ───────────────────────── sitemap и robots ───────────────────────── */

function writeSitemap(urls) {
  if (!SITE_URL) {
    console.log('  sitemap.xml не собран: в data/company.json пустой siteUrl');
    return;
  }
  const base = SITE_URL.endsWith('/') ? SITE_URL : SITE_URL + '/';
  const today = new Date().toISOString().slice(0, 10);
  const body = urls.map(u =>
    `  <url>\n    <loc>${base}${u.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n  </url>`
  ).join('\n');
  writeFileSync(join(ROOT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, 'utf8');
  writeFileSync(join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`, 'utf8');
  console.log(`  sitemap.xml: ${urls.length} адресов`);
}

/* ───────────────────────── запуск ───────────────────────── */

console.log('Сборка сайта «Золотой телёнок Алтая»');

const pages = collectPages();
for (const page of pages) if (page.draft) DRAFTS.add(page.url);
for (const page of pages) writePage(page);
console.log(`  страниц собрано: ${pages.length}`);

const hubs = buildHubs();
if (hubs.length) console.log(`  подбор по животному: ${hubs.length} разделов`);

const reference = buildReference();
if (reference.length) console.log(`  справочник товаров: ${reference.length} файлов`);

for (const [file, depth] of [['index.html', 0], ['product.html', 0]]) {
  if (injectInto(file, depth)) console.log(`  обновлены шапка и подвал: ${file}`);
}

// В карту сайта попадают главная и все страницы, кроме черновиков.
writeSitemap([
  { url: '', changefreq: 'weekly' },
  ...pages.filter(p => !p.draft).map(p => ({ url: p.url, changefreq: p.changefreq })),
  ...(hubs.length ? [{ url: 'podbor/', changefreq: 'monthly' }] : []),
  ...hubs.map(h => ({ url: `podbor/${h.slug}/`, changefreq: 'monthly' }))
]);

const drafts = pages.filter(p => p.draft);
if (drafts.length) console.log(`  черновики (не в карте сайта и не в подвале): ${drafts.map(p => p.url).join(', ')}`);
console.log('Готово.');
