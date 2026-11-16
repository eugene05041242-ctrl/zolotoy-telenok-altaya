/* Поиск по сайту: товары, статьи, разделы подбора, служебные страницы
   и группы вопросов. Индекс собирается сборкой в data/search-index.js.

   На главной странице товары в подсказках не показываются: там они и так
   фильтруются прямо в каталоге под поиском. */

(() => {
  const input = document.getElementById('catalogSearch');
  if (!input) return;

  const base = (document.querySelector('link[rel="stylesheet"]')?.getAttribute('href') || '').replace(/styles\.css$/, '');
  // Каталог с живым фильтром есть только на главной: там товары в подсказках не нужны.
  const onHome = Boolean(document.getElementById('productGrid'));

  const box = document.createElement('div');
  box.className = 'search-suggest';
  box.setAttribute('role', 'listbox');
  box.hidden = true;
  input.closest('.nav-search')?.appendChild(box);

  const normalize = s => s.toLowerCase().replace(/ё/g, 'е').trim();

  function find(query) {
    const index = window.__searchIndex;
    if (!Array.isArray(index)) return [];
    const words = normalize(query).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return [];

    return index
      .filter(entry => !(onHome && entry.type === 'Товар'))
      .map(entry => {
        const title = normalize(entry.title);
        const text = normalize(entry.text);
        let score = 0;
        for (const word of words) {
          if (title.includes(word)) score += 10;
          else if (text.includes(word)) score += 1;
          else return null;
        }
        if (title.startsWith(words[0])) score += 5;
        return { entry, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map(x => x.entry);
  }

  function render(results, query) {
    if (!results.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.innerHTML = results.map(r =>
      `<a class="search-item" href="${base}${r.url}" role="option">
        <span class="search-item-type">${r.type}</span>
        <span class="search-item-title">${r.title.replace(/</g, '&lt;')}</span>
      </a>`
    ).join('') + (onHome ? '' :
      `<a class="search-item search-all" href="${base}index.html?search=${encodeURIComponent(query)}#catalog">Искать «${query.replace(/</g, '&lt;')}» в каталоге товаров →</a>`);
    box.hidden = false;
  }

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) { box.hidden = true; return; }
    timer = setTimeout(() => render(find(query), query), 120);
  });

  input.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('.search-item')];
    if (e.key === 'Escape') { box.hidden = true; return; }
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[0].focus(); }
  });

  box.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('.search-item')];
    const current = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(current + 1, items.length - 1)]?.focus(); }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (current <= 0) input.focus(); else items[current - 1].focus();
    }
    if (e.key === 'Escape') { box.hidden = true; input.focus(); }
  });

  document.addEventListener('click', e => {
    if (!box.contains(e.target) && e.target !== input) box.hidden = true;
  });
})();
