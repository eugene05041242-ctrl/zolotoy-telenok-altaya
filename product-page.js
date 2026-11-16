/* Separate product page. No purchases or customer data are sent. */
const $ = s=>document.querySelector(s);
const params = new URLSearchParams(location.search);
const product = products.find(p=>p.id===params.get('id'));
// Неизвестный или пустой id: возвращаем в каталог, а не показываем случайный товар.
if(!product){location.replace('index.html#catalog');throw new Error('Unknown product id')}
const isRatobor200=product.id==='ratobor';
const isRatoborGrain250=product.id==='ratobor-grain-250';
const isRatobor=isRatobor200||isRatoborGrain250;
const rodenticideIds=['ratobor','ratobor-grain-250','krysinaya-smert-1-200','gremuchaya-smes-200'];
const isRelatedRodenticide=rodenticideIds.includes(product.id);
const rodenticideTypes={
 'ratobor':'Тесто-брикеты · 200 г',
 'ratobor-grain-250':'Зерновая приманка · 250 г',
 'krysinaya-smert-1-200':'Мягкие брикеты · 200 г',
 'gremuchaya-smes-200':'Тесто-брикеты · 200 г'
};
const premixIds=['sustavet-500','oksinorm-f-500'];
const premixTypes={'sustavet-500':'Для птицы · 500 г','oksinorm-f-500':'Для птицы и свиней · 500 г'};
const vaselinIds=['vaselin','vaselin-spaz-farm-200'];
const vaselinTypes={'vaselin':'Вазелин для животных · 200 г','vaselin-spaz-farm-200':'Для вымени · 200 г'};
const creamIds=['chamomile','iodine-cream-200','seabuckthorn-cream-200','fir-cream-200','milka-krem-250'];
const isCream=creamIds.includes(product.id);
const skeletinIds=['skeletin-birds-1kg','skeletin-sulfur-1kg','skeletin-phosphorus-1kg'];
const isSkeletin=skeletinIds.includes(product.id);
const skeletinTypes={
 'skeletin-birds-1kg':'Для всех видов птиц · 1 кг',
 'skeletin-sulfur-1kg':'С серой · 1 кг',
 'skeletin-phosphorus-1kg':'С фосфором · 1 кг'
};

const photoLabels=product.id==='sustavet-500' ? ['Главное фото','Что внутри','Как давать','Применяйте вместе','Характеристики','Хранение','Остались вопросы'] : product.id==='oksinorm-f-500' ? ['Главное фото','Что внутри','Как давать','Применяйте вместе','Характеристики','Хранение','Остались вопросы'] : product.id==='vaselin-spaz-farm-200' ? ['Главное фото','Для кого и зачем','Характеристики','Хранение и сроки','Остались вопросы'] : product.id==='milka-krem-250' ? ['Главное фото','Зачем крем','Состав','Как применять','Характеристики','Хранение и сроки','Остались вопросы'] : isCream ? ['Главное фото','Для кого и зачем','Состав','Хранение','Выбор крема','Остались вопросы'] : product.id==='skeletin-birds-1kg' ? ['Главное фото','Крепкий скелет и здоровые суставы','Усвоение кальция','Простое применение','Для кого','Состав и хранение','Вопросы и ответы'] : product.id==='skeletin-sulfur-1kg' ? ['Главное фото','Крепкая скорлупа','Сильный скелет','Простое применение','Состав и хранение','Вопросы и ответы'] : product.id==='skeletin-phosphorus-1kg' ? ['Главное фото','Сильный скелет и здоровый рост','Крепкая скорлупа','Простое применение','Для кого и как давать','Состав и хранение','Вопросы и ответы'] : ['Главное фото','Что внутри','Где размещать','Как применять','Нормы раскладки','Состав','Хранение','Остались вопросы'];
const photos=Array.isArray(product.gallery)&&product.gallery.length ? product.gallery : [product.image];
const rub=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
let current=0,zoomed=false;
let toastTimer;
function notify(s){const el=$('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
function updatePhoto(index){current=(index+photos.length)%photos.length;
 $('#mainProductPhoto').src=photos[current];$('#mainProductPhoto').alt=`${product.name} — фотография ${current+1} из ${photos.length}`;
 $('#lightboxPhoto').src=photos[current];$('#lightboxPhoto').alt=$('#mainProductPhoto').alt;
 document.querySelectorAll('.thumb-btn').forEach((button,i)=>{
  const active=i===current;
  button.classList.toggle('selected',active);
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',`${photoLabels[i]||'Фотография товара'} — фото ${i+1} из ${photos.length}${active?' (выбрано)':''}`);
 });
 const active=$('.thumb-btn.selected');const track=$('#thumbnailTrack');if(active&&track){track.scrollTo({left:active.offsetLeft-track.offsetLeft-(track.clientWidth-active.clientWidth)/2,behavior:'smooth'})}
}
function shift(delta){if(photos.length>1)updatePhoto(current+delta)}
function toggleZoom(open){zoomed=open;const l=$('#photoLightbox');l.classList.toggle('visible',open);l.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('no-scroll',open);if(open){$('#lightboxClose').focus()}else{$('#zoomPhoto').focus()}}
function setQty(n){$('#qtyInput').value=Math.max(1,Math.min(99,Number.isFinite(n)?Math.trunc(n):1))}
let buyMode='piece';
function setMode(m){
 buyMode=(m==='box'&&product.box)?'box':'piece';
 const box=buyMode==='box';
 $('#itemPrice').textContent=rub(box?product.box.price:product.price);
 $('#qtyLabel').textContent=box?'Количество коробок':'Количество';
 document.querySelectorAll('.mode-btn').forEach(b=>{const on=b.dataset.mode===buyMode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
 const n=$('#boxNote');n.hidden=!box;
 if(box)n.textContent='Коробка: '+product.box.qty+' шт. по '+rub(Math.round(product.box.price/product.box.qty))+' за штуку (оптовая скидка '+Math.round(BOX_DISCOUNT*100)+'%). Количество в коробке и скидка демонстрационные.';
 setQty(1);
}
function goToCart(){
 const qty=Math.max(1,Math.min(99,parseInt($('#qtyInput').value,10)||1));
 const ckey=buyMode==='box'?product.id+'@box':product.id;
 const key='altai-store-demo-v2';
 let cart={};
 try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))cart=saved}catch(e){}
 const previous=Number.isInteger(cart[ckey])&&cart[ckey]>0?cart[ckey]:0;
 cart[ckey]=Math.min(99,previous+qty);
 try{localStorage.setItem(key,JSON.stringify(cart))}catch(e){}
 $('#cartCount').textContent=Object.values(cart).reduce((sum,n)=>sum+(Number.isInteger(n)&&n>0?n:0),0);
 notify('Товар добавлен в корзину (демо)');
}

function init(){
 document.title=`${product.name} — Золотой теленок Алтая`;
 $('#itemTitle').textContent=product.name;
 $('#crumbName').textContent=product.name;
 $('#itemCategory').textContent=isRelatedRodenticide?'ЗАЩИТА ХОЗЯЙСТВА':product.categoryLabel.toUpperCase();
 $('#itemDescription').textContent=isRatobor200?'Ратобор — приманка от крыс и мышей в форме тесто-брикетов. Перед использованием ознакомьтесь с инструкцией и мерами предосторожности на упаковке.':product.description;
 $('#itemPrice').textContent=rub(product.price);
 if(product.box){$('#buyMode').hidden=false;$('#boxQtyLabel').textContent='· '+product.box.qty+' шт.';document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)))}
 $('#itemSubtitle').textContent=isCream ? 'Средства ухода · Крем зоокосметический' : product.categoryLabel;
 $('#itemTags').innerHTML=isRatobor200?'<span>Масса 200 г</span><span>Тесто-брикет</span>':isRatoborGrain250?'<span>Масса 250 г</span><span>Зерновая приманка</span>':product.id==='sustavet-500'?'<span>Масса 500 г</span><span>Премикс для птицы</span>':product.id==='oksinorm-f-500'?'<span>Масса 500 г</span><span>Для птицы и свиней</span>':product.id==='skeletin-birds-1kg'?'<span>Масса 1 кг</span><span>Для всех видов птиц</span>':product.id==='skeletin-sulfur-1kg'?'<span>Масса 1 кг</span><span>С серой</span>':product.id==='skeletin-phosphorus-1kg'?'<span>Масса 1 кг</span><span>С фосфором</span>':product.id==='krysinaya-smert-1-200'?'<span>Масса 200 г</span><span>Мягкие брикеты</span>':product.id==='gremuchaya-smes-200'?'<span>Масса 200 г</span><span>Тесто-брикет</span>':product.id==='vaselin-spaz-farm-200'?'<span>Масса 200 г</span><span>Для коров, коз и овец</span>':product.id==='iodine-cream-200'?'<span>Масса 200 г</span><span>Йодный крем</span>':product.id==='seabuckthorn-cream-200'?'<span>Масса 200 г</span><span>Облепиховый крем</span>':product.id==='chamomile'?'<span>Масса 200 г</span><span>Ромашковый крем</span>':product.id==='fir-cream-200'?'<span>Масса 200 г</span><span>Пихтовый крем</span>':`<span>${product.badge}</span>`;

 const relatedSection=$('#relatedCreams');
 if(isCream){
  relatedSection.hidden=false;
  const others=products.filter(p=>creamIds.includes(p.id)&&p.id!==product.id);
  // Every card navigates to a separate cream page. No item is shown as a related product to itself.
  $('#relatedCreamsGrid').innerHTML=others.map(p=>`<a class="related-cream-card" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Перейти на страницу товара ${p.name}"><span class="related-cream-image"><img src="${p.image}" alt="${p.name}" loading="lazy"></span><span class="related-cream-name">${p.name}</span><span class="related-cream-type">Крем зоокосметический</span><span class="related-cream-open">Подробнее <span aria-hidden="true">→</span></span></a>`).join('');
 }
 const relatedRodenticides=$('#relatedRodenticides');
 if(isRelatedRodenticide){
  // Show the two *other* rodenticides, linked to their individual existing pages.
  const others=products.filter(p=>rodenticideIds.includes(p.id)&&p.id!==product.id);
  relatedRodenticides.hidden=false;
  $('#relatedRodenticidesGrid').innerHTML=others.map(p=>`<a class="related-rodenticide-card" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Перейти на страницу товара ${p.name}"><span class="related-rodenticide-image"><img src="${p.image}" alt="${p.name}" loading="lazy"></span><span class="related-rodenticide-name">${p.name}</span><span class="related-rodenticide-type">${rodenticideTypes[p.id]}</span><span class="related-rodenticide-open">Смотреть товар <span aria-hidden="true">→</span></span></a>`).join('');
 }
 const relatedVaselin=$('#relatedVaselin');
 if(vaselinIds.includes(product.id)){
  const others=products.filter(p=>vaselinIds.includes(p.id)&&p.id!==product.id);
  relatedVaselin.hidden=false;
  $('#relatedVaselinGrid').innerHTML=others.map(p=>`<a class="related-rodenticide-card" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Перейти на страницу товара ${p.name}"><span class="related-rodenticide-image"><img src="${p.image}" alt="${p.name}" loading="lazy"></span><span class="related-rodenticide-name">${p.name}</span><span class="related-rodenticide-type">${vaselinTypes[p.id]}</span><span class="related-rodenticide-open">Смотреть товар <span aria-hidden="true">→</span></span></a>`).join('');
 }
 const relatedPremix=$('#relatedPremix');
 if(premixIds.includes(product.id)){
  const others=products.filter(p=>premixIds.includes(p.id)&&p.id!==product.id);
  relatedPremix.hidden=false;
  $('#relatedPremixGrid').innerHTML=others.map(p=>`<a class="related-rodenticide-card" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Перейти на страницу товара ${p.name}"><span class="related-rodenticide-image"><img src="${p.image}" alt="${p.name}" loading="lazy"></span><span class="related-rodenticide-name">${p.name}</span><span class="related-rodenticide-type">${premixTypes[p.id]}</span><span class="related-rodenticide-open">Смотреть товар <span aria-hidden="true">→</span></span></a>`).join('');
 }
 const relatedSkeletin=$('#relatedSkeletin');
 if(isSkeletin){
  // Mutual navigation: every Skeletin page links to the other two variants.
  const others=products.filter(p=>skeletinIds.includes(p.id)&&p.id!==product.id);
  relatedSkeletin.hidden=false;
  $('#relatedSkeletinGrid').innerHTML=others.map(p=>`<a class="related-skeletin-card" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Перейти на страницу товара ${p.name}"><span class="related-skeletin-image"><img src="${p.image}" alt="${p.name}" loading="lazy"></span><span class="related-skeletin-name">${p.name}</span><span class="related-skeletin-type">${skeletinTypes[p.id]}</span><span class="related-skeletin-open">Смотреть товар <span aria-hidden="true">→</span></span></a>`).join('');
 }
 $('#safetyText').hidden=!product.caution;
 const target=$('#thumbnailTrack');
 target.innerHTML=photos.map((src,i)=>`<button class="thumb-btn" type="button" data-slide="${i}" aria-label="${photoLabels[i]||'Фото'}" aria-pressed="false"><img src="${src}" alt="" loading="${i===0?'eager':'lazy'}"><span class="thumb-number">${i+1}</span></button>`).join('');
 if(photos.length<2){$('#galleryPrev').hidden=true;$('#galleryNext').hidden=true;$('#thumbPrev').hidden=true;$('#thumbNext').hidden=true}
 target.addEventListener('click',e=>{const b=e.target.closest('[data-slide]');if(b)updatePhoto(Number(b.dataset.slide))});
 $('#galleryPrev').addEventListener('click',()=>shift(-1));$('#galleryNext').addEventListener('click',()=>shift(1));
 $('#thumbPrev').addEventListener('click',()=>target.scrollBy({left:-310,behavior:'smooth'}));$('#thumbNext').addEventListener('click',()=>target.scrollBy({left:310,behavior:'smooth'}));
 $('#zoomPhoto').addEventListener('click',()=>toggleZoom(true));
 $('#lightboxClose').addEventListener('click',()=>toggleZoom(false));
 $('#lightboxPrev').addEventListener('click',()=>shift(-1));$('#lightboxNext').addEventListener('click',()=>shift(1));
 $('#photoLightbox').addEventListener('click',e=>{if(e.target===$('#photoLightbox'))toggleZoom(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&zoomed)toggleZoom(false);if(zoomed&&e.key==='ArrowLeft')shift(-1);if(zoomed&&e.key==='ArrowRight')shift(1)});
 function addTouchSwipe(element){let startX=0,startY=0;element.addEventListener('touchstart',e=>{startX=e.changedTouches[0].screenX;startY=e.changedTouches[0].screenY},{passive:true});element.addEventListener('touchend',e=>{const dx=e.changedTouches[0].screenX-startX;const dy=e.changedTouches[0].screenY-startY;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2)shift(dx>0?-1:1)},{passive:true})}
 addTouchSwipe($('#galleryStage'));addTouchSwipe($('#photoLightbox'));
 $('#qtyMinus').addEventListener('click',()=>setQty(Number($('#qtyInput').value)-1));$('#qtyPlus').addEventListener('click',()=>setQty(Number($('#qtyInput').value)+1));$('#qtyInput').addEventListener('change',()=>setQty(Number($('#qtyInput').value)));
 $('#buyOnSite').addEventListener('click',goToCart);
 try{const saved=JSON.parse(localStorage.getItem('altai-store-demo-v2')||'{}');$('#cartCount').textContent=Object.values(saved||{}).reduce((sum,n)=>sum+(Number.isInteger(n)&&n>0?n:0),0)}catch(e){}
 if(product.ozonUrl&&/^https:\/\//.test(product.ozonUrl)){$('#buyOzon').href=product.ozonUrl}else{$('#buyOzon').removeAttribute('target');$('#buyOzon').removeAttribute('rel');$('#buyOzon').setAttribute('aria-disabled','true');$('#buyOzon').addEventListener('click',e=>{e.preventDefault();notify('Ссылка на Ozon для этого товара пока не добавлена')})}
 $('#openCart').addEventListener('click',()=>{location.href='index.html?cart=1#catalog'});
 $('#mobileMenuToggle').addEventListener('click',()=>{const el=$('#mobileNav'),open=el.classList.toggle('open');$('#mobileMenuToggle').setAttribute('aria-expanded',String(open))});
 $('#catalogSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();location.href=`index.html?search=${encodeURIComponent(e.target.value.trim())}#catalog`}});
 updatePhoto(0);
}
init();
