/* Отзывы. Все цифры — по публичным данным магазина на Ozon на 02.11.2026 (обновлять вручную).
   Настоящие отзывы добавляются в массив `items` ниже. Выдуманные отзывы не использовать. */
const reviewsData = {
  shopUrl: 'https://www.ozon.ru/seller/zolotoy-telenok-altaya/',
  rating: '4,9',
  reviewsTotal: 5043,
  ordersLabel: '12 тыс.',
  asOf: '02.11.2026',
  // true — пока нет настоящих отзывов, показать пустые заготовки, чтобы видеть оформление.
  // Когда в items появятся тексты, поставьте false.
  showPlaceholders: false,
  /* Формат одного отзыва:
     { stars: 5, text: 'Текст отзыва', author: 'Имя, регион', productId: 'ratobor', url: 'https://www.ozon.ru/product/…/' } */
  items: [
    { stars: 5, text: 'Заказал уже третий пакет добавок. Хороший магазин, товар свежий.', author: 'Константин С.', productId: 'skeletin-phosphorus-1kg', url: 'https://www.ozon.ru/product/4882204639/reviews/' },
    { stars: 5, text: 'Состав мне понравился, насыпала в минеральные кормушки, гуси и цыплята сами подходят и клюют по мере надобности.', author: 'Тамара', productId: 'skeletin-phosphorus-1kg', url: 'https://www.ozon.ru/product/4882204639/reviews/' },
    { stars: 5, text: 'упаковано хорошо, срок годности норм, состав хороший, способ подачи легкий', author: 'Анастасия', productId: 'skeletin-phosphorus-1kg', url: 'https://www.ozon.ru/product/4882204639/reviews/' },
    { stars: 5, text: 'курочкам нравится, да и запах скелетона приятный, рекомендую', author: 'Любовь В.', productId: 'skeletin-phosphorus-1kg', url: 'https://www.ozon.ru/product/4882204639/reviews/' },
    { stars: 5, text: 'для доения самое то! не текёт, ложится ровно, экономично. с весом не слукавили. рекомендую!', author: 'Ирина К.', productId: 'chamomile', url: 'https://www.ozon.ru/product/4897948141/reviews/' },
    { stars: 5, text: 'Отличный крем, подходит для коровки и моих рук. Очень хорошо упакован', author: 'Лариса М.', productId: 'chamomile', url: 'https://www.ozon.ru/product/4897948141/reviews/' },
    { stars: 5, text: 'хороший крем, жирный, хорошо впитывается и смягчает кожу. Пахнет облепихой.', author: 'Татьяна Н.', productId: 'seabuckthorn-cream-200', url: 'https://www.ozon.ru/product/4897948141/reviews/' }
  ],
  // Оценка и число отзывов по товарам (Ozon, обновлено 09–12.11.2026). У связанных карточек число общее.
  byProduct: {
    'chamomile': { rating: '4,9', count: 228 },
    'seabuckthorn-cream-200': { rating: '4,9', count: 228 },
    'iodine-cream-200': { rating: '4,9', count: 87 },
    'fir-cream-200': { rating: '4,8', count: 37 },
    'skeletin-phosphorus-1kg': { rating: '4,9', count: 567 },
    'skeletin-sulfur-1kg': { rating: '4,9', count: 567 },
    'skeletin-birds-1kg': { rating: '4,9', count: 99 },
    'ratobor': { rating: '5,0', count: 34 },
    'ratobor-grain-250': { rating: '4,9', count: 43 },
    'krysinaya-smert-1-200': { rating: '4,9', count: 1616 },
    'gremuchaya-smes-200': { rating: '4,9', count: 101 },
    'oksinorm-f-500': { rating: '4,9', count: 323 },
    'sustavet-500': { rating: '5,0', count: 199 },
    'milka-krem-250': { rating: '5,0', count: 7 },
    'vaselin-spaz-farm-200': { rating: '4,7', count: 144 }
  }
};

(() => {
  const fmt = n => new Intl.NumberFormat('ru-RU').format(n);
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const starsText = n => '★'.repeat(n) + '☆'.repeat(5 - n);

  // 1. Блок на главной
  const feed = document.getElementById('reviewsFeed');
  if (feed) {
    document.getElementById('reviewsRating').textContent = reviewsData.rating;
    document.getElementById('reviewsCount').textContent =
      fmt(reviewsData.reviewsTotal) + ' ' + plural(reviewsData.reviewsTotal, 'отзыв', 'отзыва', 'отзывов') + ' на Ozon';
    document.getElementById('reviewsOrders').textContent = reviewsData.ordersLabel;
    document.getElementById('reviewsShopLink').href = reviewsData.shopUrl;
    document.getElementById('reviewsAsOf').textContent = reviewsData.asOf;

    const byId = id => (typeof products !== 'undefined' ? products.find(p => p.id === id) : null);
    if (reviewsData.items.length) {
      reviewsData.items.forEach(r => {
        const card = el('article', 'review-card');
        const stars = el('div', 'review-stars', starsText(r.stars || 5));
        stars.setAttribute('aria-label', 'Оценка ' + (r.stars || 5) + ' из 5');
        card.append(stars, el('p', 'review-text', r.text));
        const meta = el('div', 'review-meta');
        meta.append(el('strong', '', r.author || 'Покупатель Ozon'));
        const p = r.productId && byId(r.productId);
        if (p) meta.append(el('span', '', p.name));
        card.append(meta);
        if (r.url && /^https:\/\//.test(r.url)) {
          const a = el('a', 'review-link', 'Читать на Ozon →');
          a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          card.append(a);
        }
        feed.append(card);
      });
    } else if (reviewsData.showPlaceholders) {
      for (let i = 0; i < 4; i++) {
        const card = el('article', 'review-card placeholder');
        card.setAttribute('aria-hidden', 'true');
        card.append(el('div', 'review-stars', starsText(5)));
        const lines = el('div', 'review-skeleton');
        lines.append(el('i'), el('i'), el('i'));
        card.append(lines, el('div', 'review-placeholder-label', 'Здесь будет настоящий отзыв покупателя'));
        feed.append(card);
      }
    } else {
      document.querySelector('.reviews-feed-wrap').hidden = true;
    }
    const step = () => Math.max(260, Math.round(feed.clientWidth * 0.8));
    document.getElementById('reviewsPrev').addEventListener('click', () => feed.scrollBy({ left: -step(), behavior: 'smooth' }));
    document.getElementById('reviewsNext').addEventListener('click', () => feed.scrollBy({ left: step(), behavior: 'smooth' }));
  }

  // 2. Строка с оценкой на странице товара
  const line = document.getElementById('productRating');
  if (line && typeof products !== 'undefined') {
    const id = new URLSearchParams(location.search).get('id');
    const product = products.find(p => p.id === id);
    const info = product && reviewsData.byProduct[product.id];
    if (info) {
      line.textContent = '★ ' + info.rating + ' · ' + fmt(info.count) + ' ' + plural(info.count, 'отзыв', 'отзыва', 'отзывов') + ' на Ozon →';
      line.setAttribute('aria-label', 'Оценка ' + info.rating + ' из 5, ' + info.count + ' отзывов на Ozon. Открыть карточку на Ozon');
      if (product.ozonUrl && /^https:\/\//.test(product.ozonUrl)) {
        line.href = product.ozonUrl;
        line.hidden = false;
      }
    }
  }
})();
