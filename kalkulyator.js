/* Калькуляторы премикса. Только честная арифметика от нормы с упаковки:
   граммы = килограммы корма × процент × 10.
   Нормы берутся из data/doses.js, который собирается из data/reference/*.json.
   Товар без нормы на этикетке в списке не появляется. */

(() => {
  const $ = s => document.querySelector(s);
  const fmt = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n);
  const plural = (n, one, few, many) => {
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  };

  /* ───── Калькулятор по массе корма ───── */
  const premix = $('#calcPremix');
  if (premix) {
    const select = $('#calcProduct'), percentInput = $('#calcPercent');
    const feedInput = $('#calcFeed'), result = $('#calcResult'), hint = $('#calcHint');
    const customRow = $('#calcCustomRow');

    const loadDoses = () => new Promise(resolve => {
      if (Array.isArray(window.__doses)) return resolve(window.__doses);
      const script = document.createElement('script');
      // Путь к данным считаем от подключённого styles.css — страница может лежать на любой глубине.
      const base = (document.querySelector('link[rel="stylesheet"]')?.getAttribute('href') || '').replace(/styles\.css$/, '');
      script.src = base + 'data/doses.js';
      script.addEventListener('load', () => resolve(window.__doses || []));
      script.addEventListener('error', () => resolve([]));
      document.head.appendChild(script);
    });

    const calculate = () => {
      const feed = Number(feedInput.value);
      const chosen = (window.__doses || []).find(d => d.id === select.value);
      const percent = chosen ? chosen.percent : Number(percentInput.value);

      if (!Number.isFinite(feed) || feed <= 0 || !Number.isFinite(percent) || percent <= 0) {
        result.textContent = 'Введите массу корма и норму ввода.';
        hint.textContent = '';
        return;
      }

      const grams = feed * percent * 10;
      result.innerHTML = `<strong>${fmt(grams)} г</strong> премикса на ${fmt(feed)} кг корма`;

      const parts = [`Норма ${fmt(percent)}% — это ${fmt(percent * 10)} г на 1 кг корма.`];
      if (chosen && chosen.spoon) parts.push(`Производитель указывает: ${chosen.spoon}.`);
      if (!chosen) parts.push('Норма введена вручную — сверьте её с упаковкой.');
      parts.push('Действительной считается норма на вашей упаковке.');
      hint.textContent = parts.join(' ');
    };

    loadDoses().then(doses => {
      select.innerHTML = doses.map(d => `<option value="${d.id}">${d.name}</option>`).join('')
        + '<option value="">Другой товар — введу норму сам</option>';
      const toggleCustom = () => { customRow.hidden = Boolean(select.value); };
      select.addEventListener('change', () => { toggleCustom(); calculate(); });
      toggleCustom();
      calculate();
    });

    [feedInput, percentInput].forEach(el => el.addEventListener('input', calculate));
  }

  /* ───── Калькулятор для свиней: таблица по массе животного с упаковки ───── */
  const pigs = $('#calcPigs');
  if (pigs) {
    const group = $('#pigGroup'), count = $('#pigCount'), days = $('#pigDays'), result = $('#pigResult');

    const calculate = () => {
      const [low, high] = group.value.split('-').map(Number);
      const heads = Number(count.value), period = Number(days.value);

      if (!Number.isFinite(heads) || heads <= 0 || !Number.isFinite(period) || period <= 0) {
        result.textContent = 'Укажите число голов и срок.';
        return;
      }

      const min = low * heads * period / 1000;
      const max = high * heads * period / 1000;
      const range = low === high ? `${fmt(min)} кг` : `${fmt(min)}–${fmt(max)} кг`;
      const perDay = low === high ? `${low} г` : `${low}–${high} г`;

      result.innerHTML = `<strong>${range}</strong> премикса на ${heads} ${plural(heads, 'голову', 'головы', 'голов')} за ${period} ${plural(period, 'день', 'дня', 'дней')}`
        + `<span class="calc-sub">Это ${perDay} на голову в сутки по таблице с упаковки.</span>`;
    };

    [group, count, days].forEach(el => el.addEventListener('input', calculate));
    group.addEventListener('change', calculate);
    calculate();
  }
})();
