/* Demo catalog. Test prices and placeholder Ozon URLs. No payments, backend, or order transmission. */

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const known = new Set(products.map(x=>x.id));const byId=id=>products.find(x=>x.id===id);
const rub=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const BOXSFX='@box';const splitKey=k=>k.endsWith(BOXSFX)?{id:k.slice(0,-BOXSFX.length),box:true}:{id:k,box:false};
const unitPrice=k=>{const {id,box}=splitKey(k),p=byId(id);return p?(box?(p.box?p.box.price:0):p.price):0};
let cart={};try{const saved=JSON.parse(localStorage.getItem('altai-store-demo-v2')||'{}');for(const [k,n] of Object.entries(saved||{})){const {id,box}=splitKey(k);if(known.has(id)&&(!box||byId(id).box)&&Number.isInteger(n)&&n>0&&n<=99)cart[k]=n}}catch(e){}
let filter='all',query='',toastTimer;
function notify(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500)}
function totalCount(){return Object.values(cart).reduce((a,b)=>a+b,0)}
function totalAmount(){return Object.entries(cart).reduce((a,[k,n])=>a+unitPrice(k)*n,0)}
function save(){try{localStorage.setItem('altai-store-demo-v2',JSON.stringify(cart))}catch(e){}}
/* Фильтр по животному. Состав групп берётся из data/animals-index.js,
   который сборка делает из data/animals.json: товар попадает в группу,
   только если это животное указано на его этикетке. */
let animalFilter='';
function animalProducts(slug){const group=(window.__animalFilters||[]).find(a=>a.slug===slug);return group?group.products:null}
function drawAnimalFilters(){const box=$('#animalFilters');if(!box)return;const groups=window.__animalFilters||[];
 if(!groups.length){box.hidden=true;return}
 box.hidden=false;
 box.innerHTML='<span class="animal-filters-label">Для кого:</span>'+
  '<button type="button" class="filter active" data-animal="">Все</button>'+
  groups.map(g=>`<button type="button" class="filter" data-animal="${g.slug}">${g.title}</button>`).join('');
 box.addEventListener('click',e=>{const b=e.target.closest('[data-animal]');if(!b)return;
  animalFilter=b.dataset.animal;
  box.querySelectorAll('[data-animal]').forEach(x=>x.classList.toggle('active',x.dataset.animal===animalFilter));
  drawProducts()});
}
function drawProducts(){const allowed=animalFilter?animalProducts(animalFilter):null;
 const list=products.filter(p=>(filter==='all'||p.category===filter)&&(!allowed||allowed.includes(p.id))&&(p.name+' '+p.categoryLabel).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
 $('#productGrid').innerHTML=list.map(p=>`<article class="product-card" data-product-id="${p.id}"><div class="product-photo"><span class="product-badge ${p.caution?'caution':''}">${p.badge}</span><a href="product.html?id=${encodeURIComponent(p.id)}" class="product-photo-link" aria-label="Открыть страницу товара: ${p.name}"><img src="${p.image}" alt="${p.name}" loading="lazy"></a></div><div class="product-content"><span class="product-category">${p.categoryLabel}</span>${p.category==='care' && p.badge==='Зоокосметический крем' ? '<span class="product-type">Крем зоокосметический</span>' : ''}<a class="product-title" href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a><div class="product-desc">Оригинальная фотография из карточки товара</div><div class="product-price"><strong>${rub(p.price)}</strong><small>Тестовая цена</small></div><div class="product-actions"><button type="button" class="to-cart" data-add="${p.id}">🛒 В корзину</button><button type="button" class="to-ozon" data-ozon="${p.id}">Купить на <span class="ozon-word">Ozon</span></button></div></div></article>`).join('');
 const n=list.length;$('#catalogCount').textContent=n+' '+(n===1?'товар':n>1&&n<5?'товара':'товаров');$('#emptyState').hidden=n!==0;
}
function resetAnimal(){animalFilter='';const box=$('#animalFilters');if(box)box.querySelectorAll('[data-animal]').forEach(x=>x.classList.toggle('active',x.dataset.animal===''))}
function setFilter(f){filter=f;resetAnimal();$$('.filter').forEach(el=>el.classList.toggle('active',el.dataset.category===f));drawProducts()}
function drawCart(){save();let n=totalCount();$('#cartCount').textContent=n;$('#drawerCount').textContent='('+n+')';$('#cartTotal').textContent=rub(totalAmount());$('#checkoutBtn').disabled=n===0;$('#checkoutBtn').style.opacity=n?1:.4;
 const items=Object.keys(cart).filter(k=>cart[k]>0).map(k=>{const {id,box}=splitKey(k);return {key:k,box,p:byId(id)}}).filter(x=>x.p);
 $('#cartItems').innerHTML=items.length?items.map(({key,box,p})=>`<div class="cart-row"><img src="${p.image}" alt=""><div class="cart-row-info"><strong>${p.name}</strong><small>${box?`Коробка ${p.box.qty} шт. · ${rub(p.box.price)} · оптовая цена, демо`:'Демонстрационная цена'}</small><div class="cart-line-price">${rub(unitPrice(key)*cart[key])}</div><div class="qty"><button data-id="${key}" data-delta="-1" aria-label="Уменьшить количество ${p.name}">−</button><span>${cart[key]}${box?' кор.':''}</span><button data-id="${key}" data-delta="1" aria-label="Увеличить количество ${p.name}">+</button><button class="remove" data-remove="${key}">Удалить</button></div></div></div>`).join(''):`<div class="cart-empty"><svg viewBox="0 0 64 64"><path d="M5 8h8l7 33h30l7-23H15"/><circle cx="25" cy="52" r="3"/><circle cx="49" cy="52" r="3"/></svg><h3>В корзине пока пусто</h3><p>Добавьте товары, чтобы посмотреть оформление заказа.</p></div>`;
}
function add(id){if(!known.has(id))return;cart[id]=Math.min(99,(cart[id]||0)+1);drawCart();notify('Товар добавлен в корзину (демо)')}
function ozon(id){const p=byId(id);if(!p)return;if(p.ozonUrl&&/^https:\/\//.test(p.ozonUrl)){window.open(p.ozonUrl,'_blank','noopener,noreferrer')}else notify('Ссылка на Ozon пока не добавлена. Для этого нужна точная ссылка на товар.')}
function scrollState(){document.body.classList.toggle('no-scroll',$('#cartDrawer').classList.contains('open')||$$('.modal-overlay.visible').length>0)}
function closeCart(){const d=$('#cartDrawer');d.classList.remove('open');d.setAttribute('aria-hidden','true');$('#scrim').hidden=true;scrollState()}
function openCart(){closeModal('#checkoutModal');$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');$('#scrim').hidden=false;scrollState();$('#closeCart').focus()}
function closeModal(sel){const m=$(sel);m.classList.remove('visible');m.setAttribute('aria-hidden','true');scrollState()}
function openModal(sel){closeCart();const m=$(sel);m.classList.add('visible');m.setAttribute('aria-hidden','false');scrollState()}
function plural(n,one,few,many){const a=n%10,b=n%100;return a===1&&b!==11?one:a>=2&&a<=4&&(b<12||b>14)?few:many}
function cartSummary(){let pcs=0,boxes=0;for(const [k,n] of Object.entries(cart)){if(splitKey(k).box)boxes+=n;else pcs+=n}
 const parts=[];if(pcs)parts.push(pcs+' шт.');if(boxes)parts.push(boxes+' '+plural(boxes,'коробка','коробки','коробок'));return parts.join(' и ')}
function openCheckout(){if(!totalCount())return;$('#orderPreview').innerHTML=`<span>${cartSummary()} в корзине</span><strong>${rub(totalAmount())}</strong>`;$('#checkoutForm').hidden=false;$('#checkoutSuccess').hidden=true;openModal('#checkoutModal');$('#closeCheckout').focus()}
$('#productGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-add],[data-ozon],[data-info]');if(btn){if(btn.dataset.add)add(btn.dataset.add);if(btn.dataset.ozon)ozon(btn.dataset.ozon);if(btn.dataset.info)location.href='product.html?id='+encodeURIComponent(btn.dataset.info);return}if(e.target.closest('a'))return;const card=e.target.closest('[data-product-id]');if(card)location.href='product.html?id='+encodeURIComponent(card.dataset.productId)});
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b)setFilter(b.dataset.category)});
$('#catalogSearch').addEventListener('input',e=>{query=e.target.value.trim();drawProducts()});
$$('[data-catlink]').forEach(a=>a.addEventListener('click',()=>{setFilter(a.dataset.catlink);query='';$('#catalogSearch').value=''}));
$('#showAllLink').addEventListener('click',()=>{setFilter('all');query='';$('#catalogSearch').value=''});
$('#clearFilters').addEventListener('click',()=>{setFilter('all');query='';$('#catalogSearch').value=''});
$('#openCart').addEventListener('click',openCart);$('#closeCart').addEventListener('click',closeCart);$('#scrim').addEventListener('click',closeCart);
$('#cartItems').addEventListener('click',e=>{const b=e.target.closest('[data-id],[data-remove]');if(!b)return;const id=b.dataset.id||b.dataset.remove;if(!known.has(splitKey(id).id))return;if(b.dataset.remove)delete cart[id];else{cart[id]=Math.min(99,Math.max(0,(cart[id]||0)+Number(b.dataset.delta)));if(!cart[id])delete cart[id]}drawCart()});
$('#checkoutBtn').addEventListener('click',openCheckout);$('#closeCheckout').addEventListener('click',()=>closeModal('#checkoutModal'));
$('#checkoutForm').addEventListener('submit',e=>{e.preventDefault();$('#checkoutForm').reset();$('#checkoutForm').hidden=true;$('#checkoutSuccess').hidden=false});$('#successClose').addEventListener('click',()=>closeModal('#checkoutModal'));
$$('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal('#'+m.id)}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCart();$$('.modal-overlay.visible').forEach(m=>closeModal('#'+m.id))}});
$('#mobileMenuToggle').addEventListener('click',()=>{const el=$('#mobileNav'),opened=el.classList.toggle('open');$('#mobileMenuToggle').setAttribute('aria-expanded',String(opened))});$$('#mobileNav a').forEach(a=>a.addEventListener('click',()=>{$('#mobileNav').classList.remove('open');$('#mobileMenuToggle').setAttribute('aria-expanded','false')}));
const params=new URLSearchParams(location.search);
if(params.has('search')){query=params.get('search')||'';$('#catalogSearch').value=query}
drawAnimalFilters();drawProducts();drawCart();
if(params.has('add')){const id=params.get('add'),count=Number(params.get('qty')||1);if(known.has(id)){
 const amount=Number.isFinite(count)?Math.max(1,Math.min(99,Math.trunc(count))):1;
 cart[id]=Math.min(99,(cart[id]||0)+amount);drawCart();notify('Товар добавлен в корзину (демо)')
}}
else if(params.has('cart'))openCart();
if(params.has('add')||params.has('cart')||params.has('search')){
 try{history.replaceState(null,'',location.pathname+(location.hash||'#catalog'))}catch(e){}
}

