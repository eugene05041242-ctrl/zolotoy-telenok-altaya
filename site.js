/* Общий скрипт служебных и информационных страниц: меню, поиск, счётчик корзины.
   Корзину не меняет — только показывает число товаров из localStorage. */
(() => {
  const $ = s => document.querySelector(s);
  const base = (document.querySelector('link[rel="stylesheet"]')?.getAttribute('href') || '').replace(/styles\.css$/, '');
  const home = base + 'index.html';

  const menu = $('#mobileMenuToggle'), nav = $('#mobileNav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  const search = $('#catalogSearch');
  if (search) search.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    location.href = `${home}?search=${encodeURIComponent(e.target.value.trim())}#catalog`;
  });

  const openCart = $('#openCart');
  if (openCart) openCart.addEventListener('click', () => { location.href = `${home}?cart=1#catalog`; });

  const count = $('#cartCount');
  if (count) {
    try {
      const saved = JSON.parse(localStorage.getItem('altai-store-demo-v2') || '{}');
      count.textContent = Object.values(saved || {})
        .reduce((sum, n) => sum + (Number.isInteger(n) && n > 0 ? n : 0), 0);
    } catch (e) { /* приватный режим или заблокированное хранилище — оставляем 0 */ }
  }
})();
