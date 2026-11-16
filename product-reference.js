/* Справочник товара: восемь вкладок на странице товара.
   Данные — data/reference/<id>.json, собранные в .js командой node build.mjs.
   Файл справочника подключается отдельным тегом <script> и только для открытого
   товара, поэтому раздел работает и при открытии сайта с диска по file://.
   Вкладка без данных не показывается. Служебное поле "check" на сайт не выводится.

   Файл подключается после product-page.js и использует его переменные product и $. */

(() => {
  const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const list = items => `<ul class="ref-list">${items.map(i => `<li>${escape(i)}</li>`).join('')}</ul>`;
  const paras = items => items.map(p => `<p>${escape(p)}</p>`).join('');
  const has = v => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '');

  const shelfLife = months => {
    if (months % 12 !== 0) return `${months} мес.`;
    const years = months / 12;
    const word = years === 1 ? 'год' : years < 5 ? 'года' : 'лет';
    return `${months} мес. (${years} ${word})`;
  };

  const rows = pairs => `<table class="ref-table"><tbody>${
    pairs.filter(([, v]) => has(v))
      .map(([k, v]) => `<tr><th>${escape(k)}</th><td>${escape(v)}</td></tr>`).join('')
  }</tbody></table>`;

  /* Дисклеймеры по группам товаров (раздел 9.2 отчёта). */
  const DISCLAIMER = {
    feed: 'Кормовая добавка. Не является лекарственным средством. Применяйте по инструкции производителя. При признаках заболевания обратитесь к ветеринарному специалисту.',
    care: 'Средство для ухода за кожей. Не является лекарственным средством для ветеринарного применения. Для наружного применения, по инструкции. При покраснении, отёке или уплотнении вымени обратитесь к ветеринарному специалисту. Хранить в недоступном для детей месте.',
    protection: 'Прочитайте инструкцию на упаковке и применяйте средство строго по ней. Опасно для человека, домашних и сельскохозяйственных животных и птицы. Храните отдельно от продуктов и кормов. При отравлении немедленно обратитесь к врачу или ветеринарному специалисту и возьмите упаковку.'
  };

  const TABS = [
    {
      key: 'description', label: 'Описание',
      available: d => has(d.description) || has(d.type),
      render: d => {
        const meta = [['Тип', d.type], ['Бренд', d.brand], ['Производитель', d.producer], ['Фасовка', d.pack]];
        return (meta.some(([, v]) => has(v)) ? rows(meta) : '') + (has(d.description) ? paras(d.description) : '');
      }
    },
    {
      key: 'audience', label: 'Для кого',
      available: d => has(d.animals),
      render: d => `<div class="ref-columns">
        <div><h4>Указано на упаковке</h4>${list(d.animals)}</div>
        ${has(d.animalsNotListed) ? `<div><h4>Производителем не указано</h4>${list(d.animalsNotListed)}</div>` : ''}
      </div>
      <p class="ref-caution">Для других видов животных производитель применение не указывает, поэтому норму мы подсказать не можем. Обратитесь к ветеринарному специалисту.</p>`
    },
    {
      key: 'composition', label: 'Состав',
      available: d => has(d.composition) || has(d.guaranteed),
      render: d => (has(d.composition) ? list(d.composition) : '')
        + (has(d.guaranteed) ? `<h4>Гарантированные показатели</h4>${rows(Object.entries(d.guaranteed))}` : '')
        + '<p class="ref-note">Состав приведён по этикетке производителя. Сведения, которых нет на упаковке, мы не добавляем.</p>'
    },
    {
      /* У средств от грызунов эта вкладка открыта по умолчанию и стоит перед «Как применять». */
      key: 'safety', label: 'Меры безопасности', first: true,
      available: d => has(d.safety),
      render: d => {
        const s = d.safety;
        return `<div class="ref-danger">
          ${rows([
            ['Действующее вещество', s.activeSubstance],
            ['Концентрация', s.concentration],
            ['Класс опасности', s.hazardClass],
            ['Номер государственной регистрации', s.regNumber]
          ])}
          ${has(s.rules) ? list(s.rules) : ''}
          ${has(s.pets) ? `<p><strong>Домашние животные.</strong> ${escape(s.pets)}</p>` : ''}
          ${has(s.poisoning) ? `<p><strong>При отравлении.</strong> ${escape(s.poisoning)}</p>` : ''}
        </div>`;
      }
    },
    {
      key: 'dose', label: 'Как применять',
      available: d => has(d.dose) || has(d.mixNotes),
      render: d => {
        const dose = d.dose || {};
        let html = '';
        if (has(dose.percent) && has(dose.gPerKg)) {
          html += `<p class="ref-dose"><strong>${dose.percent}% от массы корма</strong> — это ${dose.gPerKg} г на 1 кг корма${has(dose.spoon) ? `, ${escape(dose.spoon)}` : ''}.</p>`;
        }
        if (has(dose.byWeight)) {
          html += `<table class="ref-table"><thead><tr><th>Группа</th><th>Норма на голову</th></tr></thead><tbody>${
            dose.byWeight.map(r => `<tr><td>${escape(r.group)}</td><td>${escape(r.amount)}</td></tr>`).join('')
          }</tbody></table>`;
        }
        if (has(dose.notes)) html += list(dose.notes);
        if (has(d.mixNotes)) html += `<h4>Как смешивать</h4>${list(d.mixNotes)}`;
        return html + '<p class="ref-note">Норма ввода считается от массы корма, а не от массы животного. Если данные на вашей упаковке отличаются, следуйте упаковке.</p>';
      }
    },
    {
      key: 'storage', label: 'Хранение и срок',
      available: d => has(d.storage) || has(d.shelfLifeMonths),
      render: d => rows([
        ['Условия хранения', d.storage],
        ['Срок годности', has(d.shelfLifeMonths) ? shelfLife(d.shelfLifeMonths) : ''],
        ['Где искать дату изготовления', d.dateLocation]
      ]) + '<p class="ref-note">Дата изготовления и срок годности напечатаны на упаковке. Если данные на упаковке отличаются от сайта, верной считается упаковка.</p>'
    },
    {
      /* Показывается только при наличии проверенного номера документа и срока действия. */
      key: 'docs', label: 'Документы',
      available: d => has(d.docs),
      render: d => `<table class="ref-table"><thead><tr><th>Документ</th><th>Номер</th><th>Действует до</th></tr></thead><tbody>${
        d.docs.map(doc => `<tr><td>${escape(doc.type)}</td><td>${escape(doc.number)}</td><td>${escape(doc.validUntil || '—')}</td></tr>`).join('')
      }</tbody></table>`
    },
    {
      key: 'faq', label: 'Вопросы покупателей',
      available: d => Array.isArray(d.faq) && d.faq.length >= 3,
      render: (d, p) => `<div class="ref-faq">${
        d.faq.map(item => `<div class="ref-faq-item"><h4>${escape(item.q)}</h4><p>${escape(item.a)}</p></div>`).join('')
      }</div>${
        p.ozonUrl && /^https:\/\//.test(p.ozonUrl)
          ? `<a class="ref-ask" href="${p.ozonUrl.replace(/\/$/, '')}/questions/" target="_blank" rel="nofollow noopener">Задать вопрос на Ozon →</a>`
          : ''
      }`
    }
  ];

  function render(data) {
    const section = document.getElementById('reference');
    const tabsBox = document.getElementById('referenceTabs');
    const panels = document.getElementById('referencePanels');
    if (!section || !data) return;

    const tabs = TABS.filter(t => t.available(data));
    if (!tabs.length) return;

    const found = tabs.findIndex(t => t.first);
    const start = found >= 0 ? found : 0;

    tabsBox.innerHTML = tabs.map((t, i) =>
      `<button type="button" class="ref-tab${i === start ? ' active' : ''}${t.first ? ' danger' : ''}" role="tab" id="reftab-${t.key}" aria-controls="refpanel-${t.key}" aria-selected="${i === start}" tabindex="${i === start ? 0 : -1}">${t.label}</button>`
    ).join('');

    const disclaimer = DISCLAIMER[product.category];
    panels.innerHTML = tabs.map((t, i) =>
      `<div class="ref-panel" role="tabpanel" id="refpanel-${t.key}" aria-labelledby="reftab-${t.key}"${i === start ? '' : ' hidden'}>${t.render(data, product)}${
        disclaimer ? `<p class="ref-disclaimer">${disclaimer}</p>` : ''
      }</div>`
    ).join('');

    const buttons = [...tabsBox.querySelectorAll('.ref-tab')];
    const select = index => buttons.forEach((b, i) => {
      const on = i === index;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      panels.children[i].hidden = !on;
    });

    buttons.forEach((b, i) => b.addEventListener('click', () => select(i)));
    tabsBox.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const current = buttons.findIndex(b => b.getAttribute('aria-selected') === 'true');
      const next = (current + step + buttons.length) % buttons.length;
      select(next);
      buttons[next].focus();
    });

    section.hidden = false;
  }

  /* Ленивое подключение: загружается файл только открытого товара и только
     если он существует — список собирается сборщиком в data/reference-index.js. */
  if (!Array.isArray(window.__referenceIndex) || !window.__referenceIndex.includes(product.id)) return;

  const script = document.createElement('script');
  script.src = `data/reference/${product.id}.js`;
  script.async = true;
  script.addEventListener('load', () => render((window.__reference || {})[product.id]));
  script.addEventListener('error', () => { /* справочника для этого товара ещё нет — раздел не показываем */ });
  document.head.appendChild(script);
})();
